// Opens every demo and the main site pages in a headless browser and reports problems.
// Needs Playwright; it is looked up locally, then in the Home Assistant Material frontend folder.
import { createRequire } from 'node:module';
import { existsSync, mkdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { ROOT, walk } from './lib.mjs';
import { makeServer } from './serve.mjs';

const FRONTEND = 'C:\\Users\\cntow\\Documents\\GitHub\\home-assistant-material\\frontend';
function findPlaywright() {
  const tries = [import.meta.url, join(FRONTEND, 'package.json')];
  for (const base of tries) {
    const req = createRequire(base);
    for (const name of ['playwright', '@playwright/test', 'playwright-core']) {
      try { const m = req(name); if (m.chromium) return m; } catch { /* next */ }
    }
  }
  const pnpm = join(FRONTEND, 'node_modules', '.pnpm');
  if (existsSync(pnpm)) {
    try {
      const req = createRequire(join(pnpm, 'playwright-core@1.64.1', 'node_modules', 'playwright-core', 'package.json'));
      const m = req('playwright-core'); if (m.chromium) return m;
    } catch { /* give up */ }
  }
  return null;
}

const pw = findPlaywright();
if (!pw) { console.log('SKIPPED: Playwright could not be found. Install it or run from a machine that has it.'); process.exit(0); }

const SITE = join(ROOT, '_site');
if (!existsSync(SITE)) { console.log('Run "node build.mjs" first.'); process.exit(1); }
const SHOTS = join(ROOT, '_shots');
mkdirSync(SHOTS, { recursive: true });

const server = makeServer(SITE);
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;

let browser;
try { browser = await pw.chromium.launch({ headless: true }); } catch (e) {
  console.log(`SKIPPED: the browser could not start (${String(e.message).split('\n')[0]}).`);
  server.close(); process.exit(0);
}

const FAKE_RUNS = { workflow_runs: [{ id: 1, run_number: 462, status: 'in_progress', conclusion: null, display_title: 'Pretend build', created_at: '2026-11-16T00:00:00Z' }] };
const FAKE_JOBS = { jobs: [
  { name: 'Work out versions', status: 'completed', conclusion: 'success' },
  { name: 'Build the frontend', status: 'completed', conclusion: 'success' },
  { name: 'Build amd64 core images', status: 'in_progress', conclusion: null },
  { name: 'Build the amd64 operating system image', status: 'queued', conclusion: null },
  { name: 'Publish the release', status: 'queued', conclusion: null },
] };

async function open(width, height, { mockApi = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const bad = [];
  page.on('console', (m) => { if (m.type() === 'error') bad.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => bad.push(`page error: ${e.message}`));
  await page.route('**/*', (route) => {
    const u = new URL(route.request().url());
    if (u.hostname === '127.0.0.1') return route.continue();
    if (mockApi && u.hostname === 'api.github.com') {
      const body = /\/jobs/.test(u.pathname) ? FAKE_JOBS : FAKE_RUNS;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    }
    bad.push(`network: request left the machine: ${u.href}`);
    return route.abort();
  });
  return { ctx, page, bad };
}
const hscroll = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

let failures = 0;
const rows = [];

// ---------- Demos ----------
const demoFiles = walk(join(SITE, 'demos')).filter((f) => f.endsWith('.html')).sort();
for (const f of demoFiles) {
  const rel = relative(SITE, f).split(sep).join('/');
  const problems = [];
  let interacted = 'none';
  const { ctx, page, bad } = await open(880, 900, { mockApi: false });
  try {
    await page.goto(`${ORIGIN}/${rel}`, { waitUntil: 'load' });
    for (const w of [320, 880]) {
      await page.setViewportSize({ width: w, height: 900 });
      const over = await hscroll(page);
      if (over > 1) problems.push(`sideways scroll of ${over}px at ${w}px`);
    }
    const before = await page.evaluate(() => document.querySelector('main').innerText);
    const target = await page.evaluateHandle(() => {
      const main = document.querySelector('main');
      const btn = [...main.querySelectorAll('button:not([disabled]):not([data-demo-reset])')].find((b) => b.offsetParent !== null);
      if (btn) return btn;
      return [...main.querySelectorAll('input[type=text],input[type=search],input:not([type])')].find((i) => i.offsetParent !== null) || null;
    });
    const el = target.asElement();
    if (!el) problems.push('nothing to click or type into');
    else {
      const tag = await el.evaluate((n) => n.tagName);
      if (tag === 'INPUT') { await el.fill('a'); await page.keyboard.press('b'); interacted = 'typed'; } else { await el.click(); interacted = 'clicked'; }
      await page.waitForTimeout(150);
      const after = await page.evaluate(() => document.querySelector('main').innerText);
      if (after === before) problems.push('the page text did not change after the first interaction');
    }
    const reset = await page.$('[data-demo-reset]');
    if (!reset) problems.push('no reset button'); else await reset.click();
  } catch (e) {
    problems.push(`exception: ${String(e.message).split('\n')[0]}`);
  }
  problems.push(...bad);
  await ctx.close();
  rows.push([rel, interacted, problems.length ? 'FAIL' : 'ok', problems.join('; ')]);
  if (problems.length) failures += 1;
}

// ---------- Site pages ----------
const sitePages = [
  ['home', '/index.html'],
  ['home-calendar', '/index.html#calendar'],
  ['release-457', '/releases/457/index.html'],
  ['release-137', '/releases/137/index.html'],
  ['compare', '/compare/index.html?from=441&to=457'],
  ['404', '/404.html'],
];
for (const w of [320, 1280]) {
  for (const [name, path] of sitePages) {
    const { ctx, page, bad } = await open(w, 900);
    const problems = [];
    try {
      await page.goto(`${ORIGIN}${path}`, { waitUntil: 'load' });
      await page.waitForTimeout(500);
      if (name.startsWith('home')) {
        const input = await page.$('#home-search');
        if (input) {
          await input.fill('camera');
          await page.waitForTimeout(300);
          const marks = await page.$$eval('#version-list mark', (m) => m.length);
          const shown = await page.$$eval('#version-list > li:not([hidden])', (m) => m.length);
          if (!marks) problems.push('search for "camera" marked nothing');
          if (!shown) problems.push('search for "camera" showed no versions');
          await input.fill('');
          await page.waitForTimeout(100);
        }
        const day = await page.$('.cal-day');
        if (day) { await day.click(); await page.waitForTimeout(100); const n = await page.$$eval('#version-list > li:not([hidden])', (m) => m.length); if (!n) problems.push('choosing a calendar day showed no versions'); await page.click('#f-clear'); }
        else problems.push('no calendar day with versions');
        const strip = await page.$eval('#update-strip', (s) => !s.hidden).catch(() => false);
        if (!strip) problems.push('the update strip did not appear');
      }
      if (name.startsWith('release')) {
        const tab = await page.$('[data-start]');
        if (tab && name === 'release-457') { await tab.click(); await page.waitForSelector('.demo-frame iframe', { timeout: 3000 }).catch(() => problems.push('demo iframe did not load')); }
        const q = await page.$('#chg-q');
        if (q) { await q.fill('zzzzzzzz'); const none = await page.$eval('#chg-none', (n) => !n.hidden); if (!none) problems.push('change search with no match did not say so'); await q.fill(''); }
      }
      if (name === 'compare') {
        const rowsN = await page.$$eval('.cmp-table tbody tr', (r) => r.length);
        if (rowsN < 5) problems.push('comparison table did not render');
      }
      const over = await hscroll(page);
      if (over > 1) problems.push(`sideways scroll of ${over}px`);
      await page.screenshot({ path: join(SHOTS, `${name}-${w}.png`), fullPage: name === 'compare' || name === '404' ? true : false });
    } catch (e) { problems.push(`exception: ${String(e.message).split('\n')[0]}`); }
    problems.push(...bad);
    await ctx.close();
    rows.push([`${name} @${w}`, '-', problems.length ? 'FAIL' : 'ok', problems.join('; ')]);
    if (problems.length) failures += 1;
  }
}

// ---------- Language, theme and layout matrix (320 px) ----------
const matrixPages = [['home', '/index.html'], ['release-457', '/releases/457/index.html'], ['compare', '/compare/index.html?from=441&to=457'], ['features', '/features/index.html'], ['feature-article', '/features/exports/index.html'], ['settings', '/settings/index.html']];
for (const w of [320, 1280]) {
  for (const lng of ['yue', 'both']) {
    for (const theme of ['light', 'dark']) {
      for (const [name, path] of matrixPages) {
        const { ctx, page, bad } = await open(w, 900);
        const problems = [];
        try {
          await page.addInitScript(([l, t]) => { try { sessionStorage.setItem('hamu-lang', l); localStorage.setItem('hamu-set', JSON.stringify({ theme: t })); } catch (e) { /* ignore */ } }, [lng, theme]);
          await page.goto(`${ORIGIN}${path}`, { waitUntil: 'load' });
          await page.waitForTimeout(400);
          const over = await hscroll(page);
          if (over > 1) problems.push(`sideways scroll of ${over}px`);
          const attr = await page.evaluate(() => document.documentElement.getAttribute('data-lang'));
          if (attr !== lng) problems.push(`language mode was ${attr}, expected ${lng}`);
          const nav = await page.$eval('.head-nav a', (a) => a.textContent);
          if (lng === 'yue' && !/[一-鿿]/.test(nav)) problems.push('navigation did not switch to Cantonese');
        } catch (e) { problems.push(`exception: ${String(e.message).split('\n')[0]}`); }
        problems.push(...bad);
        await ctx.close();
        rows.push([`${name} @${w} ${lng} ${theme}`, '-', problems.length ? 'FAIL' : 'ok', problems.join('; ')]);
        if (problems.length) failures += 1;
      }
    }
  }
}

// ---------- Feature checks ----------
async function check(name, fn, width = 1280) {
  const { ctx, page, bad } = await open(width, 900);
  const problems = [];
  try { await fn(page, problems); } catch (e) { problems.push(`exception: ${String(e.message).split('\n')[0]}`); }
  problems.push(...bad);
  await ctx.close();
  rows.push([`feature: ${name}`, '-', problems.length ? 'FAIL' : 'ok', problems.join('; ')]);
  if (problems.length) failures += 1;
}
const GO = (page, p) => page.goto(`${ORIGIN}${p}`, { waitUntil: 'load' }).then(() => page.waitForTimeout(400));

await check('language cycle on the header', async (page, pr) => {
  await GO(page, '/index.html');
  await page.click('#lang-btn'); // yue
  if ((await page.evaluate(() => document.documentElement.getAttribute('data-lang'))) !== 'yue') pr.push('first click did not give Cantonese');
  const t = await page.$eval('.head-nav a', (a) => a.textContent);
  if (!/所有版本/.test(t)) pr.push(`nav text was ${t}`);
  await page.click('#lang-btn'); // both
  const both = await page.$$eval('.head-nav a .l2', (n) => n.length);
  if (!both) pr.push('both mode showed no second language');
  await page.click('#lang-btn'); // en
  if ((await page.evaluate(() => document.documentElement.getAttribute('data-lang'))) !== null) pr.push('third click did not return to English');
});

await check('pattern builder on the home search', async (page, pr) => {
  await GO(page, '/index.html');
  await page.fill('#home-search', 'camera');
  await page.click('[data-regex="home-search"]');
  await page.waitForSelector('#wb-pat');
  const pat = await page.inputValue('#wb-pat');
  if (!/camera/.test(pat)) pr.push(`pattern was ${pat}`);
  await page.fill('#wb-pat', '\\bcamera\\b');
  await page.click('text=Use this pattern');
  const v = await page.inputValue('#home-search');
  if (v !== '/\\bcamera\\b/i') pr.push(`search value after Use was ${v}`);
  await page.waitForTimeout(200);
  if (!(await page.$$eval('#version-list mark', (m) => m.length))) pr.push('regex search marked nothing');
  await page.fill('#home-search', '/(/');
  await page.waitForTimeout(100);
  if (!(await page.$('.field-err'))) pr.push('a bad pattern showed no error');
});

await check('every search field has a pattern button', async (page, pr) => {
  for (const [p, id] of [['/index.html', 'home-search'], ['/releases/457/index.html', 'chg-q'], ['/compare/index.html', null], ['/features/index.html', 'ft-q'], ['/settings/index.html', 'set-q'], ['/index.html', 'head-q-none']]) {
    if (!id || id === 'head-q-none') continue;
    await GO(page, p);
    if (!(await page.$(`[data-regex="${id}"]`))) pr.push(`${p}: no pattern button for ${id}`);
  }
  await GO(page, '/compare/index.html?from=441&to=457');
  await page.waitForSelector('[data-regex="cmp-q"]', { timeout: 3000 }).catch(() => {});
  if (!(await page.$('[data-regex="cmp-q"]'))) pr.push('compare: no pattern button for the compare search');
  await GO(page, '/features/index.html');
  if (!(await page.$('[data-regex="head-q"]'))) pr.push('features: no pattern button for the header search');
});

await check('export versions as CSV and JSON', async (page, pr) => {
  await GO(page, '/index.html');
  await page.click('#exp-versions > summary');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#exp-versions [data-export="csv"]')]);
  const path = await dl.path(); const text = (await import('node:fs')).readFileSync(path, 'utf8');
  if (!/^"build","core"/.test(text) || text.split('\n').length < 20) pr.push('CSV looked wrong');
  await page.click('#exp-versions > summary');
  const [dl2] = await Promise.all([page.waitForEvent('download'), page.click('#exp-versions [data-export="json"]')]);
  const j = JSON.parse((await import('node:fs')).readFileSync(await dl2.path(), 'utf8'));
  if (!Array.isArray(j) || j.length < 20) pr.push('JSON looked wrong');
  if (!(await page.$$eval('#toasts .toast', (t) => t.length))) pr.push('no toast after export');
});

await check('bulk select, export selected, compare selected', async (page, pr) => {
  await GO(page, '/index.html');
  await page.check('input.sel[value="441"]'); await page.check('input.sel[value="457"]');
  const n = await page.textContent('#bulk-n-versions');
  if (!/2/.test(n)) pr.push(`selected count said ${n}`);
  await page.click('#bulk-versions [data-bulk-export]');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#bulk-versions [data-export="json"][data-selected]')]);
  const j = JSON.parse((await import('node:fs')).readFileSync(await dl.path(), 'utf8'));
  if (j.length !== 2) pr.push(`export selected gave ${j.length} rows`);
  await Promise.all([page.waitForURL(/compare\/index\.html\?from=441&to=457/), page.click('#bulk-versions [data-bulk="compare"]')]);
});

await check('bulk and export on a change list', async (page, pr) => {
  await GO(page, '/releases/457/index.html');
  await page.check('details.change:nth-of-type(1) input.sel');
  if (!/1/.test(await page.textContent('#bulk-n-changes'))) pr.push('selection not counted');
  await page.click('#bulk-changes [data-bulk-export]');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#bulk-changes [data-export="md"][data-selected]')]);
  const text = (await import('node:fs')).readFileSync(await dl.path(), 'utf8');
  if (!/\| sha \|/.test(text)) pr.push('Markdown export looked wrong');
});

await check('command palette with Ctrl+Shift+F', async (page, pr) => {
  await GO(page, '/index.html');
  await page.keyboard.press('Control+Shift+F');
  await page.waitForSelector('#pal-q');
  await page.fill('#pal-q', 'settings');
  await page.waitForTimeout(300);
  const n = await page.$$eval('#pal-list li[role=option]', (l) => l.length);
  if (n < 2) pr.push(`palette found ${n} results for settings`);
  await page.keyboard.press('Escape');
  if (await page.$('#ov')) pr.push('Escape did not close the palette');
  await page.keyboard.press('Control+Shift+F');
  await page.fill('#pal-q', 'build 457');
  await page.waitForTimeout(300);
  await Promise.all([page.waitForURL(/releases\/457\//), page.keyboard.press('Enter')]);
});

await check('notification centre', async (page, pr) => {
  await GO(page, '/index.html');
  await page.click('#lang-btn'); await page.click('#lang-btn'); await page.click('#lang-btn');
  const n = await page.textContent('#bell-n');
  if (!(+n > 0)) pr.push('bell showed no unread notifications');
  await page.click('#bell-btn');
  const items = await page.$$eval('#ov .notes li', (l) => l.length);
  if (items < 1) pr.push('notification centre was empty');
  await page.keyboard.press('Escape');
});

await check('collapse filters remembers state', async (page, pr) => {
  await GO(page, '/index.html');
  await page.click('#f-toggle');
  if (await page.$eval('#f-body', (b) => !b.hidden)) pr.push('filters did not collapse');
  const act = await page.textContent('#f-active'); if (!act) pr.push('no active summary while collapsed');
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(300);
  if (await page.$eval('#f-body', (b) => !b.hidden)) pr.push('collapsed state was not remembered');
});

await check('chart scrubbing by keyboard', async (page, pr) => {
  await GO(page, '/index.html');
  await page.focus('#chart-box');
  const a = await page.textContent('#chart-read');
  await page.keyboard.press('ArrowLeft');
  const b = await page.textContent('#chart-read');
  if (a === b) pr.push('arrow key did not move the chart reading');
});

await check('calendar arrow keys and day filter', async (page, pr) => {
  await GO(page, '/index.html');
  await page.focus('.cal-day[aria-pressed]');
  await page.keyboard.press('ArrowLeft');
  const d = await page.evaluate(() => document.activeElement.getAttribute('data-day'));
  if (!d) pr.push('arrow key did not move to another day');
  const labels = await page.$$eval('.cal-day', (b) => b.map((x) => x.getAttribute('aria-label')));
  if (!labels.some((l) => /version.*change/.test(l))) pr.push('day labels lack counts');
});

await check('settings: theme, text size, switches, reset with two keys', async (page, pr) => {
  await GO(page, '/settings/index.html');
  await page.click('[data-set="theme"][data-val="dark"]');
  if ((await page.evaluate(() => document.documentElement.getAttribute('data-theme'))) !== 'dark') pr.push('dark theme not applied');
  await page.click('[data-set="ts"][data-val="2"]');
  if ((await page.evaluate(() => getComputedStyle(document.body).fontSize)) !== '32px') pr.push('text size 200 percent not applied');
  await page.check('[data-switch="contrast"]');
  if (!(await page.evaluate(() => document.documentElement.classList.contains('hc')))) pr.push('contrast class missing');
  await page.reload({ waitUntil: 'load' });
  if ((await page.evaluate(() => document.documentElement.getAttribute('data-theme'))) !== 'dark') pr.push('theme not kept after reload');
  await page.click('#reset-all');
  await page.waitForSelector('#sc-slide');
  if (!(await page.$eval('#sc-slide', (s) => s.disabled))) pr.push('slider was usable before both keys');
  const keys = await page.$$('button.key'); for (const k of keys) await k.click();
  await page.fill('#sc-slide', '100');
  await page.dispatchEvent('#sc-slide', 'input');
  await page.click('#ov button.danger');
  await page.waitForTimeout(200);
  if ((await page.evaluate(() => document.documentElement.getAttribute('data-theme'))) !== null) pr.push('reset did not clear the theme');
});

await check('settings: wording file valid, invalid and clear', async (page, pr) => {
  await GO(page, '/settings/index.html');
  const fs = await import('node:fs'); const os = await import('node:os');
  const ok = join(os.tmpdir(), 'hamu-vocab-ok.json'); const bad = join(os.tmpdir(), 'hamu-vocab-bad.json');
  fs.writeFileSync(ok, JSON.stringify({ schemaVersion: 1, entries: { Settings: 'Controls' } }));
  fs.writeFileSync(bad, '{"schemaVersion":2,"entries":{}}');
  await page.setInputFiles('#vocab-file', bad); await page.waitForTimeout(200);
  if (!/schema version/i.test(await page.textContent('#vocab-state'))) pr.push('invalid file gave no reason');
  await page.setInputFiles('#vocab-file', ok); await page.waitForTimeout(300);
  if (!/1 entries/.test(await page.textContent('#vocab-state'))) pr.push('valid file not reported');
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(300);
  const nav = await page.$eval('.head-nav a:last-child', (a) => a.textContent);
  if (nav !== 'Controls') pr.push(`wording not applied after reload (nav said ${nav})`);
  await page.click('#vocab-clear');
  await page.reload({ waitUntil: 'load' });
  const nav2 = await page.$eval('.head-nav a:last-child', (a) => a.textContent);
  if (nav2 !== 'Settings') pr.push('original wording not restored after clear');
  fs.unlinkSync(ok); fs.unlinkSync(bad);
});

await check('settings search with a pattern', async (page, pr) => {
  await GO(page, '/settings/index.html');
  await page.fill('#set-q', '/contrast|motion/i'); await page.waitForTimeout(200);
  const n = await page.$$eval('.setting:not([hidden])', (r) => r.length);
  if (n !== 2) pr.push(`pattern search showed ${n} settings, expected 2`);
  await page.click('[data-info="contrast"]');
  if (await page.$eval('#i-contrast', (m) => m.hidden)) pr.push('info button did not open the explanation');
});

await check('features page filter and article', async (page, pr) => {
  await GO(page, '/features/index.html');
  await page.click('[data-state="built"]'); await page.waitForTimeout(100);
  const shown = await page.$$eval('.ft-row:not([hidden])', (r) => r.length);
  if (!shown || shown === (await page.$$eval('.ft-row', (r) => r.length))) pr.push('state filter did not narrow the list');
  await page.click('.ft-row:not([hidden])');
  await page.waitForSelector('article h1');
});

await check('release page: tab, start demo, change search with a pattern', async (page, pr) => {
  await GO(page, '/releases/457/index.html');
  await page.fill('#chg-q', '/camera/i'); await page.waitForTimeout(200);
  const shown = await page.$$eval('details.change:not([hidden])', (r) => r.length);
  if (!shown || shown > 20) pr.push(`regex search showed ${shown} changes`);
  const tabs = await page.$$('[role=tab]');
  if (tabs.length > 1) { await tabs[1].click(); if (await page.$eval('[role=tab][aria-selected=true]', (t) => t === null)) pr.push('tab did not select'); }
});

await browser.close();
server.close();

const wid = Math.max(...rows.map((r) => r[0].length));
console.log(`${'Page'.padEnd(wid)}  Interaction  Result  Notes`);
for (const r of rows) console.log(`${r[0].padEnd(wid)}  ${r[1].padEnd(11)}  ${r[2].padEnd(6)}  ${r[3]}`);
console.log(`\n${rows.length - failures} of ${rows.length} passed, ${failures} failed.`);
process.exit(failures ? 1 : 0);
