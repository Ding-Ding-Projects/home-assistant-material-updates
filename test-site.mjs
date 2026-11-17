// Exercises the site's own features in a real browser: phone header, tone, school mode, reading aids, schedules,
// tabs, context menu, appearance editor, colour picker, logo, history, locks, tools, narrator, dim sum, animation editor
// and the update wizard. Run after "node build.mjs". Pass --shots to also write screenshots to _shots/.
import { createRequire } from 'node:module';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib.mjs';
import { makeServer } from './serve.mjs';

const FRONTEND = 'C:\\Users\\cntow\\Documents\\GitHub\\home-assistant-material\\frontend';
function findPlaywright() {
  for (const base of [import.meta.url, join(FRONTEND, 'package.json')]) {
    const req = createRequire(base);
    for (const name of ['playwright', '@playwright/test', 'playwright-core']) { try { const m = req(name); if (m.chromium) return m; } catch { /* next */ } }
  }
  const pnpm = join(FRONTEND, 'node_modules', '.pnpm');
  if (existsSync(pnpm)) { try { const m = createRequire(join(pnpm, 'playwright-core@1.64.1', 'node_modules', 'playwright-core', 'package.json'))('playwright-core'); if (m.chromium) return m; } catch { /* give up */ } }
  return null;
}
const pw = findPlaywright();
if (!pw) { console.log('SKIPPED: Playwright could not be found.'); process.exit(0); }
const SITE = join(ROOT, '_site');
if (!existsSync(SITE)) { console.log('Run "node build.mjs" first.'); process.exit(1); }
const SHOTS = join(ROOT, '_shots'); mkdirSync(SHOTS, { recursive: true });
const WANT_SHOTS = process.argv.includes('--shots');
const server = makeServer(SITE);
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
let browser;
try { browser = await pw.chromium.launch({ headless: true }); } catch (e) { console.log(`SKIPPED: the browser could not start (${String(e.message).split('\n')[0]}).`); server.close(); process.exit(0); }

const FAKE_RUNS = { workflow_runs: [{ id: 1, run_number: 462, status: 'in_progress', conclusion: null, display_title: 'Pretend build', created_at: '2026-11-16T00:00:00Z' }] };
const FAKE_JOBS = { jobs: [{ name: 'Work out versions', status: 'completed', conclusion: 'success' }, { name: 'Build the frontend', status: 'completed', conclusion: 'success' }, { name: 'Build amd64 core images', status: 'in_progress', conclusion: null }, { name: 'Publish the release', status: 'queued', conclusion: null }] };

async function open(width, height, { motion = 'reduce', theme } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: motion, colorScheme: theme || 'light', permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage(); page.setDefaultTimeout(5000); const bad = [];
  page.on('console', (m) => { if (m.type() === 'error') bad.push(`console: ${m.text()}`); });
  page.on('response', (r) => { if (r.status() >= 400) bad.push('http ' + r.status() + ' ' + r.url()); });
  page.on('pageerror', (e) => bad.push(`page error: ${e.message}`));
  await page.route('**/*', (route) => {
    const u = new URL(route.request().url());
    if (u.hostname === '127.0.0.1') return route.continue();
    if (u.hostname === 'api.github.com') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(/\/jobs/.test(u.pathname) ? FAKE_JOBS : FAKE_RUNS) });
    bad.push(`network: request left the machine: ${u.href}`); return route.abort();
  });
  return { ctx, page, bad };
}
const results = []; let failures = 0;
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7);
async function test(name, fn, opts = {}) {
  if (ONLY && !name.includes(ONLY)) return;
  const w = opts.width || 1280; const { ctx, page, bad } = await open(w, opts.height || 900, opts);
  const problems = [];
  try { await fn(page, (c, msg) => { if (!c) problems.push(msg); }, ctx); } catch (e) { problems.push(`exception: ${String(e.message).split('\n')[0]}`); }
  problems.push(...bad);
  results.push([`${name} @${w}`, problems.length ? 'FAIL' : 'ok', problems.join('; ')]); if (problems.length) failures += 1; console.log(`${problems.length ? 'FAIL' : 'ok  '} ${name} @${w} ${problems.join('; ')}`);
  await ctx.close();
}
const go = async (page, path) => { await page.goto(`${ORIGIN}${path}`, { waitUntil: 'load' }); await page.waitForTimeout(250); };
const hscroll = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const setRange = (page, sel, v) => page.$eval(sel, (el, val) => { el.value = String(val); el.dispatchEvent(new Event('input', { bubbles: true })); }, v);
const PAGES = ['/index.html', '/releases/457/index.html', '/compare/index.html?from=441&to=457', '/features/index.html', '/features/tabs/index.html', '/settings/index.html', '/tools/index.html', '/tools/base64/index.html', '/tools/convert/index.html'];

for (const w of [320, 1280]) {
  await test('every page loads, no errors, no sideways scroll', async (page, ok) => {
    for (const p of PAGES) { await go(page, p); const o = await hscroll(page); ok(o <= 1, `${p}: sideways scroll ${o}px`); const t = await page.title(); ok(!!t, `${p}: no title`); }
  }, { width: w });

  await test('phone header is one row and the sheet holds every control', async (page, ok) => {
    await go(page, '/index.html');
    const hgt = await page.$eval('.site-header', (e) => e.getBoundingClientRect().height);
    if (w < 720) {
      ok(hgt < 90, `header is ${Math.round(hgt)}px tall, expected one row under 90px`);
      ok(await page.isVisible('#menu-btn'), 'menu button not visible');
      await page.click('#menu-btn'); await page.waitForSelector('#sheet.open');
      const links = await page.$$eval('#sheet .sheet-link', (a) => a.length); ok(links >= 6, `sheet has ${links} links`);
      const btns = await page.$$eval('#sheet .sheet-btns button', (a) => a.map((b) => b.textContent)); ok(btns.length >= 4, `sheet has ${btns.length} buttons`);
      await page.click('#sheet .sheet-btns button:nth-child(2)'); await page.waitForTimeout(150);
      ok(await page.evaluate(() => document.documentElement.getAttribute('data-lang') !== null), 'language button in the sheet did nothing');
      await page.keyboard.press('Escape'); await page.waitForTimeout(100);
      ok(!(await page.$('#sheet')), 'Escape did not close the sheet');
    } else ok(!(await page.isVisible('#menu-btn')), 'menu button should be hidden on wide screens');
  }, { width: w });
}

await test('playfulness changes known strings at each level and persists', async (page, ok) => {
  await go(page, '/settings/index.html');
  const want = { 1: 'Settings', 2: 'Settings', 3: 'Settings', 4: 'Settings, your way', 5: 'Knobs, dials and switches!' };
  for (const lv of [1, 4, 5, 3]) { await setRange(page, '.xctl[data-x="play"] input[type=range] >> nth=0', lv).catch(() => {}); }
  const sliders = await page.$$('.xctl[data-x="play"] input[type=range]'); ok(sliders.length === 2, 'two playfulness sliders expected');
  for (const lv of [5, 4, 1, 3]) { await sliders[0].evaluate((el, v) => { el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true })); }, lv); await page.waitForTimeout(80); const t = (await page.textContent('#st-h')).trim(); ok(t === want[lv], `level ${lv}: heading is "${t}", expected "${want[lv]}"`); }
  await sliders[0].evaluate((el) => { el.value = '1'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await go(page, '/index.html'); const h1 = (await page.textContent('#ix-h')).trim(); ok(h1 === 'Release notes for every version', `home headline after reload at level 1: "${h1}"`);
  await go(page, '/settings/index.html'); const ys = await page.$$('.xctl[data-x="play"] input[type=range]'); await ys[1].evaluate((el) => { el.value = '5'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.click('#lang-btn'); await page.click('#lang-btn'); await page.waitForTimeout(100); // en -> yue -> both
  await page.evaluate(() => window.HAMU.setLang('yue', true)); await page.waitForTimeout(100);
  const yt = (await page.textContent('#st-h')).trim(); ok(yt === '掣、轉盤同開關！', `Cantonese level 5 heading: "${yt}"`);
  await page.evaluate(() => window.HAMU.setLang('en', true));
  await page.check('.xctl[data-x="emoji"] input'); await page.evaluate(() => window.HAMU.toast('Probe')); const tt = (await page.$$eval('.toast', (a) => a.map((x) => x.textContent))).pop(); ok(/\u2728/.test(tt), 'emoji switch did not add an emoji to the toast');
});

await test('school mode renames the chrome and holds playfulness at 1', async (page, ok) => {
  await go(page, '/settings/index.html');
  await page.check('#school-on'); await page.waitForTimeout(100);
  const nm = (await page.textContent('.brand-short')).trim(); ok(nm === 'Home app', `brand is "${nm}"`);
  ok(await page.evaluate(() => document.documentElement.classList.contains('school')), 'school class missing');
  const st = (await page.textContent('#st-h')).trim(); ok(st === 'Settings', 'heading should be level 1');
  ok(await page.$eval('.xctl[data-x="play"] input[type=range]', (e) => e.disabled), 'sliders should be disabled in school mode');
  ok(!(await page.evaluate(() => window.HX.showDim(false))), 'dim sum must not show in school mode');
  await page.click('#school-restore'); await page.waitForTimeout(100);
  ok((await page.textContent('.brand-short')).trim() === 'HA Material', 'restore did not bring the name back');
});

await test('Focus, Calm and Reading aids', async (page, ok) => {
  await go(page, '/settings/index.html');
  await page.check('#aid-focus'); ok(!(await page.isVisible('.site-header')), 'Focus should hide the header'); ok(await page.isVisible('#focus-rest'), 'show-the-rest button missing');
  await page.click('#focus-rest'); ok(await page.isVisible('.site-header'), 'show the rest did not show the header'); await page.click('#focus-rest');
  await page.check('#aid-reading'); ok(await page.$('.ruler') !== null, 'ruler missing'); await page.mouse.move(300, 400); await page.waitForTimeout(80);
  const ry = await page.$eval('.ruler', (e) => getComputedStyle(e).top); ok(ry === '378px', `ruler top is ${ry}, expected 378px`);
  await page.check('#aid-calm'); ok(await page.evaluate(() => document.documentElement.classList.contains('aid-calm') && document.documentElement.classList.contains('aid-reading') && document.documentElement.classList.contains('aid-focus')), 'aids do not combine');
  await page.evaluate(() => window.HAMU.toast('Plain message')); ok(!(await page.$('.toast')), 'Calm should hide a plain toast');
  await page.evaluate(() => window.HAMU.toast('The file could not be read.')); ok(!!(await page.$('.toast')), 'Calm should still show an error toast');
});

await test('scheduled rules, including a range that crosses midnight', async (page, ok) => {
  await go(page, '/settings/index.html');
  const r = await page.evaluate(() => { const f = window.HX.ruleActive; const rule = { on: true, from: '22:00', to: '07:00', days: [1] }; const d = (day, hh, mm) => { const x = new Date(2026, 10, 15 + day, hh, mm); return x; }; return [f(rule, d(1, 23, 0)), f(rule, d(2, 6, 0)), f(rule, d(2, 23, 0)), f(rule, d(1, 6, 0)), f(rule, d(1, 12, 0))]; });
  ok(JSON.stringify(r) === '[true,true,false,false,false]', `midnight logic gave ${JSON.stringify(r)}`);
  await page.click('#rule-add'); await page.fill('#rule-from', '00:00'); await page.fill('#rule-to', '23:59'); await page.selectOption('#rule-lang', 'yue'); await page.selectOption('#rule-theme', 'dark'); await page.fill('#rule-name', 'All day test'); await page.click('#rule-save'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => document.documentElement.getAttribute('data-lang') === 'yue'), 'rule did not switch the language');
  ok(await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'dark'), 'rule did not switch the colours');
  const line = (await page.textContent('#sched-now')) || ''; ok(/All day test/.test(line), `active-rule line: "${line}"`);
});

await test('tabs open, switch, keep scroll, reorder and close', async (page, ok) => {
  await go(page, '/index.html'); await page.evaluate(() => window.scrollTo(0, 600)); await page.waitForTimeout(100);
  await page.click('.vcard .tab-open >> nth=0'); await page.waitForSelector('#tabstrip:not([hidden])'); await page.waitForTimeout(500);
  const n = await page.evaluate(() => window.HXT.tabs().length); ok(n === 2, `expected 2 tabs, got ${n}`);
  ok(/Build/.test((await page.textContent('h1')) || ''), 'the second tab did not show a build page');
  ok(await page.evaluate(() => location.pathname.includes('/releases/')), 'address did not follow the tab');
  await page.click('.tab2 >> nth=0'); await page.waitForTimeout(400);
  ok(await page.$('#home-search') !== null, 'first tab did not come back with the home page');
  const sy = await page.evaluate(() => window.scrollY); ok(sy > 300, `scroll position lost: ${sy}`);
  await page.focus('.tab2 >> nth=0'); await page.keyboard.press('Alt+ArrowRight'); await page.waitForTimeout(100);
  const order = await page.evaluate(() => window.HXT.tabs().map((t) => /releases/.test(t.url))); ok(order[0] === true, 'Alt+Right did not reorder the tabs');
  await page.click('#tab-new'); await page.waitForSelector('#tabcat-q'); await page.fill('#tabcat-q', 'base64'); await page.waitForTimeout(100);
  ok(await page.$('#tabcat-q + .regex-btn, .find .regex-btn') !== null, 'new-tab list has no pattern builder button');
  await page.click('#tabcat-list li >> nth=0'); await page.waitForTimeout(600);
  ok(await page.$('#b64-in') !== null, 'base64 page did not open in a tab and wire up');
  await page.click('#tab-others'); await page.waitForTimeout(100); ok((await page.evaluate(() => window.HXT.tabs().length)) === 1, 'Close others left more than one tab');
  await page.click('[data-close-tab]'); await page.waitForTimeout(100); ok(await page.$eval('#tabstrip', (e) => e.hidden), 'strip should hide when the last tab closes');
});

await test('context menu opens by keyboard, Copy works, shortcuts work', async (page, ok) => {
  await go(page, '/index.html'); await page.focus('.vcard:not([hidden]) .vtitle a >> nth=0'); await page.keyboard.press('Shift+F10'); await page.waitForSelector('.ctxmenu');
  const items = await page.$$eval('.ctxmenu button', (b) => b.map((x) => x.textContent)); ok(items.length >= 5, `menu items: ${items.length}`);
  ok(items.some((t) => /Alt\+Shift/.test(t)), 'no shortcut shown');
  await page.click('.ctxmenu [data-ctx="copy"]'); await page.waitForTimeout(200);
  const clip = await page.evaluate(() => navigator.clipboard.readText()).catch(() => ''); ok(clip.length > 3, `clipboard has "${clip}"`);
  await page.focus('.vcard:not([hidden]) .vtitle a >> nth=0'); await page.keyboard.press('Alt+Shift+L'); await page.waitForTimeout(200);
  const clip2 = await page.evaluate(() => navigator.clipboard.readText()).catch(() => ''); ok(/releases\/\d+/.test(clip2), `link shortcut copied "${clip2}"`);
  await page.click('h2 >> nth=0', { button: 'right' }); await page.waitForSelector('.ctxmenu'); await page.keyboard.press('Escape'); ok(!(await page.$('.ctxmenu')), 'Escape did not close the menu');
});

await test('colour picker translates formats both ways', async (page, ok) => {
  await go(page, '/settings/index.html'); await page.click('#pk-open'); await page.waitForSelector('#pk-hex');
  await page.fill('#pk-hex', '#336699'); await page.waitForTimeout(50);
  const v = await page.evaluate(() => ['pk-r', 'pk-g', 'pk-b', 'pk-h-n', 'pk-s-n', 'pk-l-n'].map((i) => document.getElementById(i).value)); ok(v.join(',') === '51,102,153,210,50,40', `fields: ${v.join(',')}`);
  await page.fill('#pk-r', '255'); await page.waitForTimeout(50); ok((await page.inputValue('#pk-hex')) === '#ff6699', 'RGB edit did not update hex');
  await page.fill('#pk-h-n', '120'); await page.waitForTimeout(50); const hx = await page.inputValue('#pk-hex'); ok(/^#[0-9a-f]{6}$/.test(hx) && hx !== '#ff6699', `HSL edit gave ${hx}`);
  ok((await page.textContent('#pk-contrast')).length > 10, 'no contrast read-out');
  const rt = await page.evaluate(() => { const c = window.HXC; const out = []; for (const x of ['#336699', '#ff00aa', '#102030']) { const r = c.hexToRgb(x); const hsl = c.rgbToHsl(...r); const back = c.hslToRgb(...hsl); out.push(c.rgbToHex(...back)); } return out; });
  ok(rt.every((x, i) => Math.abs(parseInt(x.slice(1, 3), 16) - parseInt(['#336699', '#ff00aa', '#102030'][i].slice(1, 3), 16)) <= 3), `round trip: ${rt}`);
  ok(await page.$('#pk-rainbow') !== null && await page.$('#pk-eye') !== null, 'rainbow or eyedropper control missing');
  await page.click('#pk-rainbow', { force: true }); ok(!(await page.isChecked('#pk-rainbow')), 'rainbow must stay off under reduced motion');
});

await test('appearance editor persists across reload and resets', async (page, ok) => {
  await go(page, '/settings/index.html'); await page.click('#ap-open'); await page.waitForSelector('#ap-kind'); await page.selectOption('#ap-kind', 'cards');
  await page.fill('#pk-hex', '#ff0000'); await page.waitForTimeout(300);
  const bg = () => page.$eval('.setting-group', (e) => getComputedStyle(e).backgroundColor);
  ok((await bg()) === 'rgb(255, 0, 0)', `card background is ${await bg()}`);
  await setRange(page, '#ap-radius', 4); await page.waitForTimeout(900);
  await page.keyboard.press('Escape'); await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(300);
  ok((await bg()) === 'rgb(255, 0, 0)', 'override did not persist across reload');
  await page.click('#ap-open'); await page.selectOption('#ap-kind', 'cards'); await page.click('#ap-reset-kind'); await page.waitForTimeout(200);
  ok((await bg()) !== 'rgb(255, 0, 0)', 'reset this kind did not remove the override');
  const exp = await page.evaluate(() => JSON.stringify(window.HX.X().ap)); ok(exp === '{}' || exp === '{"cards":{}}' || !/ff0000/.test(exp), `overrides after reset: ${exp}`);
});

await test('logo upload persists and resets', async (page, ok) => {
  await go(page, '/settings/index.html');
  const b64 = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 120; c.height = 60; const g = c.getContext('2d'); g.fillStyle = '#e91e63'; g.fillRect(0, 0, 120, 60); return c.toDataURL('image/png').split(',')[1]; });
  await page.setInputFiles('#logo-file', { name: 'x.png', mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') }); await page.waitForTimeout(500);
  ok(await page.$('.mark img') !== null, 'logo image not shown in the header');
  const stored = await page.evaluate(() => localStorage.getItem('hamu-logo') || ''); ok(/^data:image\/png;base64,/.test(stored), 'logo not stored as a data URL');
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(300); ok(await page.$('.mark img') !== null, 'logo did not persist across reload');
  await page.setInputFiles('#logo-file', { name: 'x.gif', mimeType: 'image/gif', buffer: Buffer.from('GIF89a') }); await page.waitForTimeout(150); ok(/not accepted/i.test((await page.textContent('#logo-msg')) || ''), 'a GIF should be refused');
  await page.click('#logo-reset'); await page.waitForTimeout(150); ok((await page.$('.mark img')) === null, 'reset did not bring back the shipped logo');
});

await test('history records changes and restores an entry', async (page, ok) => {
  await go(page, '/settings/index.html');
  const sl = await page.$$('.xctl[data-x="play"] input[type=range]');
  await sl[0].evaluate((el) => { el.value = '5'; el.dispatchEvent(new Event('input', { bubbles: true })); }); await page.waitForTimeout(100);
  await sl[0].evaluate((el) => { el.value = '2'; el.dispatchEvent(new Event('input', { bubbles: true })); }); await page.waitForTimeout(100);
  const n = await page.$$eval('#hist-list [data-restore]', (a) => a.length); ok(n >= 2, `history entries: ${n}`);
  const when = await page.$eval('#hist-list .mono', (e) => e.textContent); ok(/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(when), `time format: ${when}`);
  await page.click('#hist-list [data-restore] >> nth=1'); await page.waitForTimeout(200);
  ok((await page.evaluate(() => window.HX.X().play.en)) === 5, 'restoring the older entry did not bring back level 5');
});

await test('toy locks block interaction and unlock with the PIN', async (page, ok) => {
  await go(page, '/settings/index.html');
  const set = async () => { for (const k of ['1', '2', '3', '4']) await page.click(`.keypad [data-k="${k}"]`); };
  await page.evaluate(() => { const h = [...document.querySelectorAll('h2')].find((x) => x.textContent === 'Messages and records'); window.HXT_ACTIONS.lock.run(h); });
  await page.waitForSelector('.keypad'); await set(); await page.waitForTimeout(100); await set(); await page.waitForFunction(() => /"hash":"[0-9a-f]{64}"/.test(JSON.stringify(window.HX.X().locks)), null, { timeout: 4000 }).catch(() => {}); await page.waitForTimeout(100);
  const locked = await page.evaluate(() => { const s = [...document.querySelectorAll('section')].find((x) => x.querySelector('h2') && x.querySelector('h2').textContent === 'Messages and records'); return s && s.hasAttribute('inert') && s.hasAttribute('data-locked'); }); ok(locked, 'element was not locked');
  const stored = await page.evaluate(() => JSON.stringify(window.HX.X().locks)); ok(!/"pin"/i.test(stored) && /"hash":"[0-9a-f]{64}"/.test(stored), 'PIN must be stored only as a SHA-256 digest');
  const clicked = await page.evaluate(() => { const b = document.getElementById('notes-open'); let hit = false; const f = () => { hit = true; }; document.addEventListener('click', f, { once: true }); const r = b.getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return el === b; }); ok(!clicked, 'a locked button is still hit-testable');
  await page.click('#locks-list [data-act="unlock"]'); await page.waitForSelector('.keypad'); for (const k of ['0', '0', '0', '0']) await page.click(`.keypad [data-k="${k}"]`); await page.waitForTimeout(300);
  ok(/not the PIN/i.test((await page.textContent('#pin-msg')) || ''), 'a wrong PIN should be refused'); await set(); await page.waitForTimeout(400);
  ok(await page.evaluate(() => ![...document.querySelectorAll('[data-locked]')].length), 'correct PIN did not unlock');
  await page.click('#locks-list [data-act="lock"]'); await page.waitForTimeout(100); ok(await page.evaluate(() => document.querySelectorAll('[data-locked]').length === 1), 'Lock again did nothing');
  await page.click('#locks-list [data-act="remove"]'); await page.waitForSelector('.keypad'); await page.click('#pin-forgot'); await page.waitForSelector('#sc-slide'); ok(true, 'forgotten-PIN path opens the two-key confirmation');
});

await test('Base64 round trip, validation and URL-safe', async (page, ok) => {
  await go(page, '/tools/base64/index.html');
  const text = 'héllo 你好';
  await page.fill('#b64-in', text); await page.click('#b64-enc'); const enc = await page.inputValue('#b64-out'); ok(enc === 'aMOpbGxvIOS9oOWlvQ==', `encoded: ${enc}`);
  await page.click('#b64-swap'); await page.click('#b64-dec'); ok((await page.inputValue('#b64-out')) === text, 'decode did not give the original text');
  await page.fill('#b64-in', 'abc$def'); await page.waitForTimeout(80); const v = await page.textContent('#b64-valid'); ok(/position 4/.test(v), `validation says: ${v}`);
  await page.fill('#b64-in', '\u00fb\u00ff?>'); await page.check('#b64-url'); await page.uncheck('#b64-pad'); await page.fill('#b64-in', '??>>'); await page.click('#b64-enc');
  const u = await page.inputValue('#b64-out'); ok(!/[+/=]/.test(u) && /[-_]/.test(u), `URL-safe output: ${u}`);
  await page.fill('#b64-in', u); await page.click('#b64-dec'); ok((await page.inputValue('#b64-out')) === '??>>', 'URL-safe did not round trip');
  await page.setInputFiles('#b64-file', { name: 'a.bin', mimeType: 'application/octet-stream', buffer: Buffer.from([0, 1, 2, 250, 251, 252]) }); await page.waitForTimeout(250); ok((await page.inputValue('#b64-file-out')).length > 4, 'file to Base64 gave nothing');
  const ex = await page.inputValue('#b64-file-out'); await page.fill('#b64-tofile-in', ex); await page.waitForTimeout(80); ok(/Valid/.test(await page.textContent('#b64-tofile-valid')), 'Base64 to file validation');
  const dl = page.waitForEvent('download'); await page.click('#b64-tofile-dl'); const d = await dl; ok(d.suggestedFilename() === 'decoded.bin', `download name ${d.suggestedFilename()}`);
});

await test('file converter: image, JSON, CSV', async (page, ok) => {
  await go(page, '/tools/convert/index.html');
  const b64 = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 40; c.height = 30; const g = c.getContext('2d'); g.fillStyle = '#3366ff'; g.fillRect(0, 0, 40, 30); return c.toDataURL('image/png').split(',')[1]; });
  await page.setInputFiles('#cv-img-file', { name: 'a.png', mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') }); await page.selectOption('#cv-img-fmt', 'image/jpeg'); await page.click('#cv-img-go'); await page.waitForTimeout(600);
  const info = await page.textContent('#cv-img-info'); ok(/image\/jpeg/.test(info), `image result: ${info}`); ok(await page.$('#cv-img-prev img') !== null, 'no preview image');
  await page.selectOption('#cv-mode', 'j2c'); await page.fill('#cv-j-in', '[{"a":1,"b":"x,y"},{"a":2,"c":{"k":1}}]'); await page.click('#cv-j-go'); const csv = await page.inputValue('#cv-j-out'); ok(csv.startsWith('a,b,c') && /"x,y"/.test(csv), `csv: ${csv}`);
  await page.selectOption('#cv-mode', 'c2j'); await page.fill('#cv-c-in', 'n,t\r\n1,"a ""q"" b"\r\n2,z'); await page.click('#cv-c-go'); const js = JSON.parse(await page.inputValue('#cv-c-out')); ok(js.length === 2 && js[0].t === 'a "q" b', 'csv to json');
  await page.selectOption('#cv-mode', 'jfmt'); await page.fill('#cv-f-in', '{"a":[1,2]}'); await page.click('#cv-f-min'); ok((await page.inputValue('#cv-f-out')) === '{"a":[1,2]}', 'minify'); await page.click('#cv-f-pretty'); ok(/\n  "a"/.test(await page.inputValue('#cv-f-out')), 'pretty');
  await page.selectOption('#cv-mode', 'text64'); await page.fill('#cv-t-in', 'héllo'); await page.click('#cv-t-enc'); ok((await page.inputValue('#cv-t-out')) === 'aMOpbGxv', 'text to base64'); ok((await page.textContent('#cv-limit')).includes('Limits'), 'limits not stated');
});

await test('narrator controls report honestly when speech is unavailable', async (page, ok) => {
  await go(page, '/settings/index.html');
  ok(await page.$('#narr-read-page') !== null && await page.$('#narr-en') !== null && await page.$('#narr-yue') !== null && await page.$('#narr-rate') !== null, 'narrator controls missing');
  const st = (await page.textContent('#narr-status')) || ''; ok(st.length > 10, 'narrator status line is empty');
  await page.click('#narr-read-page'); await page.waitForTimeout(1600);
  const msg = (await page.textContent('#toasts')) + (await page.$eval('#narr-status', (e) => e.textContent)) + (await page.$('#narr-bar') ? 'reading' : '');
  ok(/voice|speech|reading|read/i.test(msg), `no honest narrator message: ${msg.slice(0, 120)}`);
  await go(page, '/index.html'); ok((await page.$$('.read-btn')).length >= 3, 'per-section Read buttons missing');
});

await test('dim sum surprise is a built-in text card', async (page, ok) => {
  await go(page, '/index.html');
  ok(await page.evaluate(() => window.HX.showDim(true)), 'forced dim sum did not show'); const t = await page.textContent('#dimsum-card'); ok(t.length > 40, `card text: ${t}`);
  ok(!(await page.$('#dimsum-card img')), 'dim sum card must not contain a picture');
  await page.click('#dimsum-card .icon'); ok(!(await page.$('#dimsum-card')), 'card did not close');
});

await test('animation editor changes the live values and says reduced motion wins', async (page, ok) => {
  await go(page, '/settings/index.html');
  ok(/Reduced motion is on/.test((await page.textContent('#anim-rm')) || ''), 'editor does not say reduced motion wins');
  await page.evaluate(() => document.querySelectorAll('.anim-kind').forEach((d) => { d.open = true; })); await setRange(page, '#anim-page-dur', 900);
  ok((await page.evaluate(() => document.documentElement.style.getPropertyValue('--m-page-dur'))) === '900ms', 'duration did not reach the page');
  await page.selectOption('#anim-profile', 'Playful'); await page.waitForTimeout(100); ok(/1\.56/.test(await page.evaluate(() => document.documentElement.style.getPropertyValue('--m-card-ease'))), 'Playful profile did not set the spring easing');
  await page.evaluate(() => document.querySelectorAll('.anim-kind').forEach((d) => { d.open = true; })); await page.evaluate(() => { document.getElementById('anim-card-ease').value = 'custom'; document.getElementById('anim-card-ease').dispatchEvent(new Event('change')); }); await page.fill('#anim-card-b1', '0.5'); await page.dispatchEvent('#anim-card-b1', 'change');
  ok(/0\.5/.test(await page.evaluate(() => document.documentElement.style.getPropertyValue('--m-card-ease'))), 'cubic-bezier fields did not change the curve');
  ok(await page.evaluate(() => document.documentElement.classList.contains('m-rm')), 'm-rm class missing under reduced motion');
});
await test('animations run when motion is allowed and stop under Calm', async (page, ok) => {
  await go(page, '/index.html');
  const name = await page.$eval('.stat', (e) => getComputedStyle(e).animationName); ok(name === 'm-up', `stat animation is "${name}"`);
  await page.evaluate(() => { window.HX.X().aids.calm = true; window.HX.applyAll(); });
  const name2 = await page.$eval('.stat', (e) => getComputedStyle(e).animationName); ok(name2 === 'none', `Calm should stop animation, got "${name2}"`);
}, { motion: 'no-preference' });

await test('update wizard steps, ticks and summary', async (page, ok) => {
  await go(page, '/releases/457/index.html');
  ok(await page.isVisible('#wiz'), 'wizard not shown'); ok(!(await page.isVisible('#plain-steps')), 'plain list should be hidden when the wizard runs');
  await page.check('#wiz-tick'); await page.click('#wiz-next'); await page.click('#wiz-back'); ok(await page.isChecked('#wiz-tick'), 'tick was not kept');
  for (let i = 0; i < 5; i++) await page.click('#wiz-next'); const sum = await page.textContent('.wiz-sum'); ok(/1 of 5/.test(sum), `summary: ${sum}`);
  await page.click('#wiz-again'); ok(/Step 1 of 5/.test(await page.textContent('.wiz-top b')), 'start again failed');
  const noscript = await page.$eval('#plain-steps', (e) => e.querySelectorAll('li').length); ok(noscript === 5, 'plain steps must stay in the page as the no-script fallback');
});

await test('Cantonese and dark mode do not clip or scroll sideways', async (page, ok) => {
  for (const p of PAGES) { await go(page, p); await page.evaluate(() => { window.HAMU.setLang('both', true); const s = window.HAMU.SET(); s.theme = 'dark'; window.HAMU.applySet(); }); await page.waitForTimeout(150); const o = await hscroll(page); ok(o <= 1, `${p} both-languages dark: sideways scroll ${o}px`); }
}, { width: 320 });

// ---------- Searchable list boxes and change filters, at phone and wide width ----------
const F = (id) => `.cb:has(#${id}) .cb-field`;
const nums = (t) => (/(\d+) of (\d+)/.exec(t || '') || []).slice(1).map(Number);
for (const w of [320, 1280]) {
  await test('every select is a searchable list box: none left visible on home, compare, settings, tools', async (page, ok) => {
    for (const p of ['/index.html', '/compare/index.html?from=347&to=457', '/settings/index.html', '/tools/convert/index.html']) {
      await go(page, p);
      const bad = await page.$$eval('select', (a) => a.filter((s) => { const r = s.getBoundingClientRect(); const c = s.closest('.cb'); return r.width > 2 || r.height > 2 || !s.classList.contains('cb-native') || !c || !c.querySelector('.cb-field') || s.tabIndex !== -1; }).map((s) => s.id || s.name || 'select'));
      ok(bad.length === 0, `${p}: native select still showing or not upgraded: ${bad.join(', ')}`);
      const tall = await page.$$eval('.cb-field', (a) => a.filter((f) => { const h = f.getBoundingClientRect().height; return h > 0 && h < 55; }).length); ok(tall === 0, `${p}: ${tall} list box fields are shorter than 56px`);
    }
    await go(page, '/settings/index.html'); await page.click('#rule-add'); await page.waitForSelector('#rule-theme');
    const inDlg = await page.$$eval('#ov select', (a) => a.every((s) => s.classList.contains('cb-native') && !!s.closest('.cb'))); ok(inDlg, 'selects inside the dialog were not upgraded');
    ok((await page.$$('#ov .cb-field')).length >= 3, 'dialog list boxes missing');
    await page.keyboard.press('Escape'); await page.click('#ap-open'); await page.waitForSelector('#ap-kind'); ok(await page.$('.cb:has(#ap-kind) .cb-field') !== null, 'appearance editor select not upgraded');
    ok(await hscroll(page) <= 1, 'sideways scroll');
  }, { width: w });

  await test('home: From build is a searchable list box, keyboard only, with the filtered list and URL following', async (page, ok) => {
    await go(page, '/index.html');
    await page.focus(F('f-from')); await page.keyboard.press('ArrowDown'); await page.waitForSelector('.cb-panel');
    const sheet = await page.$eval('.cb-panel', (p) => p.classList.contains('cb-sheet')); ok(sheet === (w < 720), `bottom sheet should be ${w < 720} at ${w}px, was ${sheet}`);
    const box = await page.$eval('.cb-panel', (p) => { const r = p.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom, innerWidth, innerHeight]; });
    ok(box[0] >= -0.5 && box[1] >= -0.5 && box[2] <= box[4] + 0.5 && box[3] <= box[5] + 0.5, `open list is not inside the viewport: ${box.map(Math.round)}`);
    ok(await hscroll(page) <= 1, 'sideways scroll with the list open');
    ok(await page.evaluate(() => document.activeElement.classList.contains('cb-q')), 'search field is not focused on open');
    const all = nums(await page.textContent('.cb-count')); ok(all[1] >= 20, `option count ${all}`);
    ok(await page.$eval('#f-from', (s) => document.querySelector('.cb-field[aria-expanded="true"]') !== null && !!s), 'field is not marked expanded');
    await page.keyboard.type('13 Nov'); await page.waitForTimeout(120);
    const f = nums(await page.textContent('.cb-count')); ok(f[0] > 0 && f[0] < all[1], `typing 13 Nov did not filter: ${f}`);
    ok((await page.$$('.cb-opt mark')).length > 0, 'matched text is not marked');
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter'); await page.waitForTimeout(250);
    ok(!(await page.$('.cb-panel')), 'list did not close after choosing');
    ok(await page.evaluate((s) => document.activeElement === document.querySelector(s), F('f-from')), 'focus did not return to the field');
    const st = await page.textContent('#vs-status'); const sh = nums(st); ok(sh[0] < sh[1], `versions list did not change: ${st}`);
    const hash = await page.evaluate(() => location.hash); ok(/from=\d+/.test(hash), `hash: ${hash}`);
    const label = (await page.textContent(F('f-from'))).trim();
    await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(300);
    ok((await page.textContent(F('f-from'))).trim() === label, 'filtered view did not survive reload');
    ok((await page.textContent('#vs-status')) === st, 'versions list differs after reload');
    await page.click('#f-clear'); await page.waitForTimeout(200);
    ok(/oldest/.test(await page.textContent(F('f-from'))), `Clear filters did not reset the shown value: ${await page.textContent(F('f-from'))}`);
    ok(/^Showing (\d+) of \1 /.test(await page.textContent('#vs-status')), 'Clear filters did not restore the list');
    await page.focus(F('f-to')); await page.keyboard.press('ArrowDown'); await page.waitForSelector('.cb-panel'); await page.keyboard.type('457'); await page.waitForTimeout(100);
    ok(nums(await page.textContent('.cb-count'))[0] === 1, 'a build number did not narrow the list to one');
    await page.keyboard.press('Escape'); await page.waitForTimeout(100);
    ok(!(await page.$('.cb-panel')) && (await page.evaluate((s) => document.activeElement === document.querySelector(s), F('f-to'))), 'Escape did not close and return focus');
    await page.click(F('f-feat')); await page.waitForSelector('.cb-panel'); await page.click('.cb-opt >> nth=1'); await page.waitForTimeout(200);
    ok(/new features/.test(await page.textContent(F('f-feat'))), 'Kind did not change with the pointer');
    ok(await hscroll(page) <= 1, 'sideways scroll');
  }, { width: w });

  await test('compare: both pickers by keyboard, then the table follows', async (page, ok) => {
    await go(page, '/compare/index.html');
    await page.focus(F('cmp-from')); await page.keyboard.press('ArrowDown'); await page.waitForSelector('.cb-panel'); await page.keyboard.type('347'); await page.keyboard.press('Enter'); await page.waitForTimeout(250);
    await page.focus(F('cmp-to')); await page.keyboard.press('ArrowDown'); await page.waitForSelector('.cb-panel'); await page.keyboard.type('439'); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
    ok(/from=347&to=439/.test(page.url()), `url ${page.url()}`);
    const th = (await page.$$eval('.cmp-table thead th', (a) => a.map((x) => x.textContent))).join('|'); ok(/From build 347/.test(th) && /To build 439/.test(th), `table header: ${th}`);
    ok(await hscroll(page) <= 1, 'sideways scroll');
  }, { width: w });

  await test('settings: a list box in the rule editor changes the colours; Escape closes only the list', async (page, ok) => {
    await go(page, '/settings/index.html'); await page.click('#rule-add'); await page.waitForSelector('#rule-theme');
    await page.fill('#rule-from', '00:00'); await page.fill('#rule-to', '23:59');
    await page.focus(F('rule-theme')); await page.keyboard.press('ArrowDown'); await page.waitForSelector('.cb-panel'); await page.keyboard.type('dark'); await page.keyboard.press('Enter'); await page.waitForTimeout(150);
    ok((await page.$eval('#rule-theme', (s) => s.value)) === 'dark', 'colours list box did not set the native value');
    await page.focus(F('rule-lang')); await page.keyboard.press('ArrowDown'); await page.waitForSelector('.cb-panel'); await page.keyboard.press('Escape'); await page.waitForTimeout(100);
    ok(!(await page.$('.cb-panel')) && !!(await page.$('#ov')), 'Escape should close only the list, not the dialog');
    await page.fill('#rule-name', 'List box rule'); await page.click('#rule-save'); await page.waitForTimeout(250);
    ok(await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'dark'), 'the colours rule did not change the theme');
  }, { width: w });

  await test('compare: area bars filter the changes with search, the URL, the keyboard and the build list', async (page, ok) => {
    await go(page, '/compare/index.html?from=437&to=439');
    ok(/Showing 3 of 3 changes/.test(await page.textContent('#cmp-count')), `start: ${await page.textContent('#cmp-count')}`);
    const bars = await page.$$eval('.abar', (a) => a.map((b) => [b.tagName, b.getAttribute('aria-pressed'), b.getBoundingClientRect().height])); ok(bars.length === 2 && bars.every((b) => b[0] === 'BUTTON' && b[1] === 'false' && b[2] >= 48), `bars: ${JSON.stringify(bars)}`);
    await page.click('.abar[data-area="docs"]'); await page.waitForTimeout(150);
    ok(/Showing 2 of 3 changes/.test(await page.textContent('#cmp-count')) && (await page.$$('#cmp-out details.change')).length === 2, 'Documentation bar did not reduce the list and the count');
    ok((await page.getAttribute('.abar[data-area="docs"]', 'aria-pressed')) === 'true' && /areas=docs/.test(page.url()), 'bar state or URL not updated');
    ok(await page.$eval('.abar[data-area="docs"]', (b) => getComputedStyle(b.querySelector('.abar-tick'), '::before').content.length > 2), 'chosen bar shows no tick');
    const first = (await page.textContent('#cmp-out details.change .ct')).trim(); const word = (first.split(/\s+/).find((x) => /^[a-z]{5,}$/i.test(x)) || first.slice(0, 5)).toLowerCase();
    await page.fill('#cmp-q', word); await page.waitForTimeout(150);
    const both = nums(await page.textContent('#cmp-count')); ok(both[0] >= 1 && both[0] <= 2, `search plus bar: ${both}`);
    await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(400);
    ok((await page.getAttribute('.abar[data-area="docs"]', 'aria-pressed')) === 'true' && (await page.inputValue('#cmp-q')) === word && nums(await page.textContent('#cmp-count'))[0] === both[0], 'filter did not survive reload');
    await page.fill('#cmp-q', ''); await page.focus('.abar[data-area="docs"]'); await page.keyboard.press('Enter'); await page.waitForTimeout(150);
    ok(/Showing 3 of 3 changes/.test(await page.textContent('#cmp-count')) && !/areas=/.test(page.url()), 'pressing the bar again (keyboard) did not restore the list');
    await page.keyboard.press('Space'); await page.waitForTimeout(100); ok(/Showing 2 of 3/.test(await page.textContent('#cmp-count')), 'Space did not toggle the bar');
    await page.check('#cmp-expl'); await page.waitForTimeout(100); ok(/expl=1/.test(page.url()), 'explanation switch not in the URL');
    await page.focus(F('cmp-sort')); await page.keyboard.press('ArrowDown'); await page.waitForSelector('.cb-panel'); await page.keyboard.type('Old'); await page.keyboard.press('Enter'); await page.waitForTimeout(150);
    ok(/sort=old/.test(page.url()), 'sort not in the URL');
    await page.click('#cmp-clear'); await page.waitForTimeout(150);
    ok(/Showing 3 of 3 changes/.test(await page.textContent('#cmp-count')) && !/areas=|expl=|sort=/.test(page.url()) && !(await page.isChecked('#cmp-expl')), 'Clear filters did not reset everything');
    await page.fill('#cmp-q', 'zzzzzzqq'); await page.waitForTimeout(120); ok(await page.isVisible('#cmp-none'), 'no empty state'); await page.click('#cmp-empty-clear'); await page.waitForTimeout(100);
    ok(/Showing 3 of 3/.test(await page.textContent('#cmp-count')), 'empty-state Clear did not restore');
    await go(page, '/compare/index.html?from=347&to=457');
    const total = nums(await page.textContent('#cmp-count'))[1];
    await page.focus(F('cmp-builds')); await page.keyboard.press('ArrowDown'); await page.waitForSelector('.cb-panel'); ok(await page.$('.cb-tools') !== null, 'multi-select tools missing');
    await page.keyboard.press('Enter'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter'); ok(!!(await page.$('.cb-panel')), 'multi-select closed after one choice'); await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    const part = nums(await page.textContent('#cmp-count')); ok(part[0] > 0 && part[0] < total && /2 chosen/.test(await page.textContent(F('cmp-builds'))), `build filter: ${part} of ${total}`);
    ok(/builds=/.test(page.url()), 'builds not in the URL');
    await page.fill('#cmp-q', 'zzzzzzqq'); await page.waitForTimeout(150);
    ok(/2 builds have no matching change/.test(await page.textContent('#cmp-hidden-builds')), `hidden builds line: "${await page.textContent('#cmp-hidden-builds')}"`);
    ok(await hscroll(page) <= 1, 'sideways scroll');
  }, { width: w });

  await test('version page: the same bars, switch, sort, clear and URL filter its change list', async (page, ok) => {
    await go(page, '/releases/457/index.html');
    const t0 = nums(await page.textContent('#chg-count')); ok(t0[0] === t0[1] && t0[1] > 5, `start: ${t0}`);
    const bar = '.chg-bars .abar >> nth=0'; ok((await page.$eval(bar, (b) => b.getBoundingClientRect().height)) >= 48, 'bar shorter than 48px');
    await page.click(bar); await page.waitForTimeout(150);
    const t1 = nums(await page.textContent('#chg-count')); ok(t1[0] < t1[1] && /areas=/.test(page.url()), `after bar: ${t1} ${page.url()}`);
    const visible = await page.$$eval('details.change:not([hidden])', (a) => a.length); ok(visible === t1[0], `visible changes ${visible} != count ${t1[0]}`);
    await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(300);
    ok(nums(await page.textContent('#chg-count'))[0] === t1[0] && (await page.getAttribute(bar, 'aria-pressed')) === 'true', 'filter did not survive reload');
    await page.fill('#chg-q', 'camera'); await page.waitForTimeout(150); ok(nums(await page.textContent('#chg-count'))[0] <= t1[0], 'search did not combine with the bar');
    await page.click('#chg-clear'); await page.waitForTimeout(150);
    ok(nums(await page.textContent('#chg-count'))[0] === t0[1] && !/areas=|q=/.test(page.url()) && (await page.inputValue('#chg-q')) === '', 'Clear filters did not reset');
    await page.check('#chg-expl'); await page.waitForTimeout(100); ok(/expl=1/.test(page.url()) && nums(await page.textContent('#chg-count'))[0] <= t0[1], 'explanation switch');
    await page.focus(F('chg-sort')); await page.keyboard.press('ArrowDown'); await page.waitForSelector('.cb-panel'); await page.keyboard.type('Old'); await page.keyboard.press('Enter'); await page.waitForTimeout(150); ok(/sort=old/.test(page.url()), 'sort not in the URL');
    await page.fill('#chg-q', 'zzzzzzqq'); await page.waitForTimeout(120); ok(await page.isVisible('#chg-none'), 'no empty state'); await page.click('#chg-none-clear'); await page.waitForTimeout(100);
    ok(nums(await page.textContent('#chg-count'))[0] === t0[1], 'empty-state Clear did not restore');
    ok(await hscroll(page) <= 1, 'sideways scroll');
  }, { width: w });
}

if (WANT_SHOTS) {
  for (const [w, hgt] of [[320, 740], [1280, 860]]) for (const theme of ['light', 'dark']) for (const lang of ['en', 'yue']) {
    const { ctx, page } = await open(w, hgt, { theme, motion: 'reduce' });
    for (const [name, p] of [['home', '/index.html'], ['version', '/releases/457/index.html'], ['compare', '/compare/index.html?from=441&to=457'], ['settings', '/settings/index.html'], ['base64', '/tools/base64/index.html']]) {
      await go(page, p); await page.evaluate((l) => { window.HAMU.setLang(l, true); }, lang); await page.waitForTimeout(250);
      await page.screenshot({ path: join(SHOTS, `${name}-${w}-${theme}-${lang}.png`), fullPage: false });
    }
    await ctx.close();
  }
}

await browser.close(); server.close();
let width = 0; for (const r of results) width = Math.max(width, r[0].length);
for (const [n, s, d] of results) console.log(`${n.padEnd(width)}  ${s}${d ? '  ' + d : ''}`);
console.log(`\n${results.length - failures} of ${results.length} checks passed.`);
process.exit(failures ? 1 : 0);
