// Builds the whole site into _site/. Node 22, no dependencies.
import { mkdirSync, rmSync, writeFileSync, cpSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FEATURES, STATE_LABEL, STATE_LABEL_YUE } from './features.mjs';
import {
  ROOT, AREAS, areaLabel, esc, loadChanges, loadContent, fmtLong, fmtDay, fmtShort, dayOf, parts, shaEq, primaryArea,
  asArray, str, fileExists, REPOSITORY, areaYue,
} from './lib.mjs';

// A demo path must sit under demos/ as an .html file and exist on disk.
const demoExists = (p) => /^demos\/[^?#]+\.html$/.test(p) && fileExists(join(ROOT, p));

const OUT = join(ROOT, '_site');
const data = loadChanges();
const { map: contentMap } = loadContent();

// ---------- Model ----------
const releases = data.releases.filter((r) => r && r.tag !== undefined).map((r) => {
  const content = contentMap.get(r.build) || null;
  const changes = asArray(r.changes);
  const highlights = content
    ? asArray(content.highlights).filter((h) => h && typeof h === 'object' && str(h.title)).map((h, i) => {
        const id = /^[a-z0-9-]+$/.test(str(h.id)) ? str(h.id) : `feature-${i + 1}`;
        const demoPath = str(h.demo) || `demos/${r.build}/${id}.html`;
        const hasDemo = demoExists(demoPath);
        // Extra demos for the same feature: each one gets its own tab in the version's demo section.
        const extraDemos = asArray(h.more_demos)
          .filter((d) => d && typeof d === 'object' && str(d.title) && demoExists(str(d.demo)))
          .map((d, k) => ({ id: `${id}-${k + 2}`, title: str(d.title), tryIt: asArray(d.try).map(str).filter(Boolean), demoPath: str(d.demo) }));
        return {
          id, title: str(h.title), areas: asArray(h.areas).filter((a) => typeof a === 'string'),
          what: str(h.what), what_yue: str(h.what_yue), why: str(h.why),
          tryIt: asArray(h.try).map(str).filter(Boolean), demoPath: hasDemo ? demoPath : '',
          extraDemos,
        };
      })
    : [];
  const areaCounts = {};
  for (const c of changes) for (const a of asArray(c.areas)) areaCounts[a] = (areaCounts[a] || 0) + 1;
  return {
    ...r, changes, content, highlights, areaCounts,
    headline: (content && str(content.headline)) || '',
    summary: (content && str(content.summary)) || '',
    summary_yue: (content && str(content.summary_yue)) || '',
    features: highlights.length,
    demos: highlights.filter((h) => h.demoPath).length,
    demoCount: highlights.reduce((s, h) => s + (h.demoPath ? 1 : 0) + h.extraDemos.length, 0),
    feat: content ? (highlights.length ? 'y' : 'n') : 'u',
    day: dayOf(r.date),
  };
});
// newest first
releases.sort((a, b) => b.build - a.build);
const newest = releases[0];
const byBuild = new Map(releases.map((r) => [r.build, r]));

// ---------- HTML helpers ----------
function paras(text) {
  return String(text || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${esc(p).replace(/\n/g, ' ')}</p>`).join('');
}
/** English text with an optional Cantonese counterpart, switched by the header. */
function pair(en, yue, cls = '') {
  if (!en && !yue) return '';
  const c = cls ? ` ${cls}` : '';
  if (!yue) return `<div class="txt${c}">${paras(en)}</div>`;
  if (!en) return `<div class="txt t-yue${c}" lang="yue">${paras(yue)}</div>`;
  return `<div class="txt t-en has-yue${c}">${paras(en)}</div><div class="txt t-yue${c}" lang="yue">${paras(yue)}</div>`;
}
function badges(areas, cls = 'badge') {
  return asArray(areas).map((a) => `<span class="${cls}" data-yue="${esc(areaYue(a))}">${esc(areaLabel(a))}</span>`).join('');
}
function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}
function builtAt() {
  try {
    const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    const p = Object.fromEntries(f.formatToParts(new Date()).map((x) => [x.type, x.value]));
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${+p.day} ${months[+p.month - 1]} ${p.year} at ${p.hour}:${p.minute} (Toronto time)`;
  } catch {
    return new Date().toISOString();
  }
}
const BUILT = builtAt();

const PREPAINT = `(function(){var d=document.documentElement;try{var s=JSON.parse(localStorage.getItem('hamu-set')||'{}');if(s.theme==='light'||s.theme==='dark')d.setAttribute('data-theme',s.theme);if(s.ts>1)d.style.setProperty('--ts',s.ts);if(s.contrast)d.classList.add('hc');if(s.targets)d.classList.add('big');if(s.motion)d.classList.add('calm')}catch(e){}try{var l=sessionStorage.getItem('hamu-lang');if(l==='yue'||l==='both')d.setAttribute('data-lang',l)}catch(e){}})();`;

const Y = (yue) => `data-yue="${esc(yue)}"`;
const SITE_URL = 'https://ding-ding-projects.github.io/home-assistant-material-updates/';
const PKG = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const ICON = {
  search: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  regex: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 17.5v.01M12 5v9M8 7.5l8 4M16 7.5l-8 4"/></svg>',
  bell: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M10.3 20a2 2 0 0 0 3.4 0"/></svg>',
};
/** A search field with its pattern-builder button beside it. */
function findField(id, placeholder, yue, extra = '') {
  return `<div class="find" role="search"><span class="find-ic">${ICON.search}</span><label class="sr-only" for="${id}" data-yue="${esc(yue)}">${esc(placeholder)}</label><input id="${id}" type="search" placeholder="${esc(placeholder)}" data-yue-ph="${esc(yue)}" autocomplete="off"${extra}><button type="button" class="pill-icon regex-btn" data-regex="${id}" aria-label="Pattern builder for this search" data-yue-aria="呢個搜尋嘅樣式建構器">${ICON.regex}</button></div>`;
}

function layout({ title, description, root, page, main, search = true, path = '' }) {
  const searchForm = search
    ? `<form class="head-search" action="${root}index.html" method="get">${findField('head-q', 'Search all versions', '搜尋所有版本').replace('<input id="head-q"', '<input name="q" id="head-q"')}</form>`
    : '';
  const url = SITE_URL + path;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#00639b">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Home Assistant Material updates">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${SITE_URL}assets/social-preview.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Home Assistant Material updates: every version explained, with a search, a calendar and working demos">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${SITE_URL}assets/social-preview.png">
<link rel="icon" href="${root}assets/icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${root}assets/demo.css">
<link rel="stylesheet" href="${root}assets/site.css">
<link rel="stylesheet" href="${root}assets/extras.css">
<noscript><style>@media (max-width:719px){.hh{display:flex!important}.menu-btn{display:none!important}}</style></noscript>
<script>${PREPAINT}</script>
</head>
<body data-root="${root}" data-page="${page}">
<a class="skip" href="#main" data-yue="跳到內容">Skip to the content</a>
<header class="site-header">
<div class="wrap head-row">
<a class="brand" href="${root}index.html"><span class="mark" aria-hidden="true">HA</span><span class="brand-t brand-long" data-yue="Home Assistant Material 更新">Home Assistant Material updates</span><span class="brand-t brand-short" data-yue="HA Material 更新">HA Material</span></a>
<nav class="head-nav hh" aria-label="Main" data-yue-aria="主導覽">
<a href="${root}index.html#versions" data-yue="所有版本">All versions</a>
<a href="${root}index.html#calendar" data-yue="日曆">Calendar</a>
<a href="${root}compare/index.html" data-yue="比較">Compare</a>
<a href="${root}features/index.html" data-yue="功能">Features</a>
<a href="${root}tools/index.html" data-yue="工具">Tools</a>
<a href="${root}settings/index.html" data-yue="設定">Settings</a>
</nav>
<div class="hh head-search-wrap">${searchForm}</div>
<button type="button" id="pal-btn" class="pill" aria-label="Search everything, Ctrl Shift F" data-yue-aria="搜尋全部，Ctrl Shift F">${ICON.search}<span class="opt" data-yue="搜尋全部">Search everything</span></button>
<button type="button" id="lang-btn" class="pill hh" aria-label="Language: English. Change language">English</button>
<button type="button" id="theme-btn" class="pill hh" aria-label="Colours: follow the system. Change">System colours</button>
<button type="button" id="bell-btn" class="pill-icon bell hh" aria-label="Notifications" data-yue-aria="通知">${ICON.bell}<span class="badge-n" id="bell-n" hidden>0</span></button>
<button type="button" id="menu-btn" class="pill-icon menu-btn" aria-haspopup="dialog" aria-expanded="false" aria-label="Menu" data-yue-aria="選單"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
</div>
<div id="tabstrip" class="tabstrip" hidden></div>
</header>
<main id="main" class="wrap main">
<noscript><p class="note warn">The search, filters, calendar, comparison, settings and demo tools need JavaScript. The version pages and their full lists of changes are readable without it.</p></noscript>
${main}
</main>
<footer class="site-footer"><p><span data-yue="網站版本">Site version</span> ${esc(PKG.version)}. <span data-yue="建立於">Built from the public change list on</span> ${esc(BUILT)}. <span data-yue="呢個網站唔使用 cookie。">This site sets no cookies.</span></p></footer>
<div class="toasts" id="toasts" aria-live="polite"></div>
<script src="${root}assets/site.js" defer></script>
<script src="${root}assets/x-core.js" defer></script>
<script src="${root}assets/x-ui.js" defer></script>
<script src="${root}assets/tools.js" defer></script>
</body>
</html>
`;
}

function write(rel, content) {
  const p = join(OUT, rel);
  mkdirSync(join(p, '..'), { recursive: true });
  writeFileSync(p, content);
}

// ---------- Shared bits: exports and bulk actions ----------
const FORMATS = [['json', 'JSON'], ['csv', 'CSV'], ['md', 'Markdown'], ['txt', 'Plain text'], ['html', 'HTML'], ['print', 'Print']];
function exportMenu(scope, id) {
  return `<details class="expo" id="${id}"><summary class="btn tonal"><span data-yue="匯出">Export</span></summary><div class="expo-body row" role="group" aria-label="Export formats" data-yue-aria="匯出格式">${FORMATS.map(([k, l]) => `<button type="button" data-export="${k}" data-scope="${scope}">${l}</button>`).join('')}</div></details>`;
}
function bulkBar(scope, { compare = true, label = 'items' } = {}) {
  return `<div class="bulk card small-r" id="bulk-${scope}" data-scope="${scope}">
<label class="bulk-all"><input type="checkbox" data-selall="${scope}"> <span data-yue="揀晒顯示緊嘅項目">Select everything shown</span></label>
<span class="bulk-n" id="bulk-n-${scope}" aria-live="polite">0 selected</span>
<div class="row bulk-actions">
<details class="expo"><summary class="btn tonal" data-bulk-export="${scope}" aria-disabled="true"><span data-yue="匯出所選">Export selected</span></summary><div class="expo-body row" role="group" aria-label="Export formats for the selection" data-yue-aria="所選項目嘅匯出格式">${FORMATS.map(([k, l]) => `<button type="button" data-export="${k}" data-scope="${scope}" data-selected="1">${l}</button>`).join('')}</div></details>
${compare ? `<button type="button" data-bulk="compare" data-scope="${scope}" disabled data-yue="比較所選">Compare selected</button>` : ''}
${scope === 'versions' || scope === 'changes' ? `<button type="button" data-bulk="tabs" data-scope="${scope}" disabled data-yue="用分頁打開所選">Open selected as tabs</button>` : ''}
<button type="button" class="text" data-bulk="clear" data-scope="${scope}" disabled data-yue="取消揀選">Clear selection</button>
</div></div>`;
}
const MONTHS_N = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function yueDay(iso) {
  const p = parts(iso);
  return p ? `${p.y}年${p.mo}月${p.d}日` : '';
}
function builtYue() {
  const m = /^(\d+) (\w+) (\d+) at (\d\d:\d\d)/.exec(BUILT);
  return m ? `${m[3]}年${MONTHS_N.indexOf(m[2]) + 1}月${m[1]}日 ${m[4]}（多倫多時間）` : BUILT;
}

// ---------- Update strip ----------
const STAGE_NAMES = ['Preparing', 'Building the interface', 'Building Core and Supervisor', 'Publishing container images', 'Offering the Core update', 'Building operating system images', 'Publishing the release'];
function stripHtml(build) {
  return `<section id="update-strip" class="strip" data-newest="${build}" aria-labelledby="soon-h" hidden>
<div class="strip-main">
<div class="ring" id="strip-ring" role="progressbar" aria-label="Build progress" data-yue-aria="建置進度" aria-valuemin="0" aria-valuemax="100" hidden><svg viewBox="0 0 80 80" aria-hidden="true"><circle class="ring-bg" cx="40" cy="40" r="34"/><circle class="ring-fg" id="ring-fg" cx="40" cy="40" r="34" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"/></svg><span class="ring-n" id="strip-pct"></span></div>
<div class="strip-text"><h2 id="soon-h">Update coming soon</h2><p id="strip-status" role="status">Checking for a build on the way.</p></div>
<div class="row strip-actions"><button type="button" class="strip-btn" id="strip-jobs-btn" aria-expanded="false" aria-controls="strip-jobs" hidden>Show every job</button><button type="button" class="strip-btn" id="strip-refresh">Refresh</button></div>
</div>
<ol class="rail" id="strip-rail" aria-label="Build stages" data-yue-aria="建置階段" hidden>${STAGE_NAMES.map((n, i) => `<li data-stage="${i + 1}"><i></i><span>${i + 1}. ${n}</span></li>`).join('')}</ol>
<ol class="strip-jobs" id="strip-jobs" hidden></ol>
<p class="strip-checked" id="strip-checked"></p>
</section>`;
}

// ---------- Home page ----------
function versionCard(r) {
  const isNewest = r === newest;
  const title = r.headline ? `Build ${r.build}: ${r.headline}` : `Build ${r.build}`;
  const prev = byBuild.has(r.previous_build) ? r.previous_build : null;
  const areas = AREAS.filter((a) => r.areaCounts[a]);
  const summary = r.summary ? pair(r.summary, r.summary_yue, 'vsum') : '';
  return `<li class="vcard card" data-build="${r.build}" data-day="${r.day}" data-areas="${areas.join(' ')}" data-feat="${r.feat}" data-changes="${r.changes.length}">
<div class="vtop"><label class="selbox"><input type="checkbox" class="sel" data-sel="versions" value="${r.build}" aria-label="Select build ${r.build}"></label><div class="vbuild" aria-hidden="true">${r.build}</div><div class="vmeta">${isNewest ? '<span class="badge primary" data-yue="最新">Newest</span>' : ''}<span class="small muted">${esc(fmtLong(r.date))}</span><span class="small muted mono">${esc(r.core)}</span></div><div class="bignum" aria-label="${r.changes.length} changes"><b>${r.changes.length}</b><span data-yue="項更改">${r.changes.length === 1 ? 'change' : 'changes'}</span></div></div>
<h3 class="vtitle"><a href="releases/${r.build}/"><span class="vt">${esc(title)}</span></a></h3>
${summary}
<div class="vbadges">${r.demos ? `<span class="badge good">${r.demos === 1 ? 'Feature with a working demo' : `${r.demos} features with a working demo`}</span>` : ''}${areas.map((a) => `<span class="badge outline" data-yue="${esc(areaYue(a))}">${esc(areaLabel(a))}</span>`).join('')}</div>
<div class="vmatch note" hidden></div>
<div class="row vlinks"><a class="btn filled" href="releases/${r.build}/" data-yue="睇更新說明">Read the notes</a>${r.demos ? `<a class="btn" href="releases/${r.build}/#demo" data-yue="試示範">Try the demos</a>` : ''}${prev ? `<a class="btn" href="compare/index.html?from=${prev}&amp;to=${r.build}" data-yue="與第 ${prev} 版比較">Compare with build ${prev}</a>` : ''}</div>
</li>`;
}

function homePage() {
  const total = releases.reduce((s, r) => s + r.changes.length, 0);
  const demoTotal = releases.reduce((s, r) => s + r.demoCount, 0);
  const oldest = releases[releases.length - 1];
  const areaCountsVersions = {};
  for (const r of releases) for (const a of AREAS) if (r.areaCounts[a]) areaCountsVersions[a] = (areaCountsVersions[a] || 0) + 1;
  const chips = AREAS.filter((a) => areaCountsVersions[a]).map((a) => `<button type="button" class="chip" style="--w:${Math.max(4, Math.round((areaCountsVersions[a] / releases.length) * 100))}%" aria-pressed="false" data-area="${a}"><span data-yue="${esc(areaYue(a))}">${esc(areaLabel(a))}</span> <span class="count">${areaCountsVersions[a]}</span></button>`).join('');
  const builds = releases.map((r) => r.build).sort((a, b) => a - b);
  const optFor = (b, i, tag) => {
    const r = releases.find((x) => x.build === b);
    const day = r ? String(r.date || '').slice(0, 10) : '';
    const head = r ? (r.headline || (r.changes[0] ? r.changes[0].title : '')) : '';
    const mon = r ? fmtDay(r.date).replace(/^\d+ /, '') : '';
    const kw = r ? `${b} ${r.core || ''} ${fmtDay(r.date)} ${day}` : String(b);
    const badge = tag === 'oldest' ? 'oldest' : tag === 'newest' ? 'newest' : '';
    return `<option value="${b}" data-l1="Build ${b}" data-sub="${esc(`${r ? fmtDay(r.date) : ''}${head ? ', ' + head : ''}`)}" data-kw="${esc(kw)}" data-group="${esc(mon)}"${badge ? ` data-badge="${badge}"` : ''}>Build ${b}${badge ? ', ' + badge : ''}</option>`;
  };
  const newestFirst = builds.slice().reverse();
  const fromOpts = newestFirst.map((b) => { const i = builds.indexOf(b); return optFor(b, i, i === 0 ? 'oldest' : i === builds.length - 1 ? 'newest' : ''); }).join('');
  const toOpts = newestFirst.map((b) => { const i = builds.indexOf(b); return optFor(b, i, i === builds.length - 1 ? 'newest' : i === 0 ? 'oldest' : ''); }).join('');
  const main = `
<section class="intro" aria-labelledby="ix-h">
<h1 id="ix-h" class="mega" data-yue="每個更新，講清楚">Every update, explained</h1>
<p class="muted lead" data-yue="${esc(`由${oldest ? yueDay(oldest.date) : ''}起共有 ${releases.length} 個版本、${total} 項更改。每個版本都有自己嘅頁面，用淺白嘅說話講解，仲有每項新功能嘅示範。`)}">${plural(releases.length, 'version', 'versions')} and ${plural(total, 'change', 'changes')} since ${esc(oldest ? fmtDay(oldest.date) : '')}. Each version has its own page with plain-language notes and a working demo of every new feature.</p>
<p class="small muted prov" id="provenance" data-yue="${esc(`網站版本 ${PKG.version}。最後更新：${builtYue()}。`)}">Site version ${esc(PKG.version)}. Last updated ${esc(BUILT)}.</p>
<form class="bigsearch" role="search" id="home-form" action="index.html" method="get">
<span class="find-ic" aria-hidden="true">${ICON.search}</span>
<label class="sr-only" for="home-search" data-yue="搜尋每個版本同更改">Search every version and change</label>
<input id="home-search" type="search" name="q" placeholder="Search every version and change" data-yue-ph="搜尋每個版本同更改" autocomplete="off">
<span class="count-live" id="search-count" aria-live="polite"></span>
<button type="button" class="pill-icon regex-btn" data-regex="home-search" aria-label="Pattern builder for this search" data-yue-aria="呢個搜尋嘅樣式建構器">${ICON.regex}</button>
</form>
<div class="stats" role="list">
<div class="stat s1" role="listitem"><b>${releases.length}</b><span data-yue="個版本">versions</span></div>
<div class="stat s2" role="listitem"><b>${total}</b><span data-yue="項更改">changes</span></div>
<div class="stat s3" role="listitem"><b>${demoTotal}</b><span data-yue="個可操作示範">working demos</span></div>
</div>
</section>
${stripHtml(newest.build)}
<section id="chart" class="card" aria-labelledby="ch-h">
<h2 id="ch-h" data-yue="每日更改數目">Changes per day</h2>
<p class="muted small" data-yue="將游標移到圖表上面，或者用左右方向鍵，睇每日數字。">Move the pointer over the chart, or use the left and right arrow keys, to read each day.</p>
<div id="chart-box" class="chart" tabindex="0" role="group" aria-label="Chart of changes per day" data-yue-aria="每日更改圖表"></div>
<p class="small" id="chart-read" aria-live="polite"></p>
</section>
<section id="calendar" class="card cal" aria-labelledby="cal-h">
<div class="cal-head"><h2 id="cal-h" data-yue="日曆">Calendar</h2>
<div class="row">
<button type="button" class="pill-icon" id="cal-prev" aria-label="Previous month" data-yue-aria="上個月"><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 6-6 6 6 6"/></svg></button>
<label><span class="sr-only" data-yue="月份">Month</span><select id="cal-month"></select></label>
<button type="button" class="pill-icon" id="cal-next" aria-label="Next month" data-yue-aria="下個月"><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg></button>
<button type="button" class="tonal" id="cal-newest" data-yue="跳去最新">Jump to newest</button>
</div></div>
<p class="muted" id="cal-summary"></p>
<div class="scroll-x"><table class="cal-table" id="cal-table" role="grid"><caption class="sr-only" id="cal-caption">Versions per day</caption><thead><tr><th scope="col" data-yue="一">Mon</th><th scope="col" data-yue="二">Tue</th><th scope="col" data-yue="三">Wed</th><th scope="col" data-yue="四">Thu</th><th scope="col" data-yue="五">Fri</th><th scope="col" data-yue="六">Sat</th><th scope="col" data-yue="日">Sun</th></tr></thead><tbody id="cal-body"></tbody></table></div>
<div class="legend small muted"><span data-yue="按當日更改數目着色：">Tint by changes that day:</span>
<span class="lg"><i class="heat1"></i>1 to 19</span><span class="lg"><i class="heat2"></i>20 to 99</span><span class="lg"><i class="heat3"></i>100 or more</span>
<span data-yue="數字一定會寫喺日子上面。窄螢幕會縮短成「1 / 52」。">The numbers are always written on the day. On a narrow screen they shorten to "1 / 52".</span></div>
<h3 class="year-h" data-yue="每月概覽">Months at a glance</h3>
<div class="scroll-x"><table class="year-table" id="year-table"><thead><tr><th scope="col" data-yue="月份">Month</th><th scope="col" data-yue="版本">Versions</th><th scope="col" data-yue="更改">Changes</th><th scope="col"><span class="sr-only">Show</span></th></tr></thead><tbody id="year-body"></tbody></table></div>
</section>
<section id="versions" aria-labelledby="vs-h" class="versions">
<div class="vs-head"><h2 id="vs-h" data-yue="版本">Versions</h2><p class="muted" id="vs-status" aria-live="polite" data-total="${releases.length}">Showing ${releases.length} of ${releases.length} versions</p></div>
<div class="card small-r filters">
<div class="row filters-top"><button type="button" id="f-toggle" class="text" aria-expanded="true" aria-controls="f-body">Hide filters</button><span class="small muted" id="f-active" aria-live="polite"></span>${exportMenu('versions', 'exp-versions')}</div>
<div id="f-body" class="stack">
<div role="group" aria-label="Part of the product" data-yue-aria="產品部分" class="row">${chips}</div>
<div class="row filter-row">
<label class="field grow"><span data-yue="種類">Kind</span><select id="f-feat"><option value="all">All versions</option><option value="y">With new features</option><option value="n">Housekeeping only</option></select></label>
<label class="field grow"><span data-yue="由建置">From build</span><select id="f-from">${fromOpts}</select></label>
<label class="field grow"><span data-yue="到建置">To build</span><select id="f-to">${toOpts}</select></label>
<label class="field grow"><span data-yue="次序">Order</span><select id="f-sort"><option value="new">Newest first</option><option value="old">Oldest first</option></select></label>
<button type="button" id="f-clear" data-yue="清除篩選">Clear filters</button>
</div></div></div>
${bulkBar('versions')}
<ol class="version-list" id="version-list">
${releases.map(versionCard).join('\n')}
</ol>
<div class="note dashed" id="hidden-note" hidden><span id="hidden-text"></span> <button type="button" class="text" id="hidden-clear" data-yue="清除篩選">Clear filters</button></div>
</section>`;
  return layout({
    title: 'Home Assistant Material updates', description: 'Every Home Assistant Material update, explained in plain words, with a search, a calendar and a working demo of each new feature.',
    root: '', page: 'home', main, search: false, path: '',
  });
}

// ---------- Release page ----------
function groupChanges(changes) {
  const groups = new Map();
  for (const c of changes) {
    const a = primaryArea(c.areas);
    if (!groups.has(a)) groups.set(a, []);
    groups.get(a).push(c);
  }
  return [...AREAS, 'other'].filter((a) => groups.has(a)).map((a) => [a, groups.get(a)]);
}

function changeHtml(c) {
  const detail = pair(str(c.detail), str(c.detail_yue), 'cdetail');
  return `<details class="change" id="c-${esc(c.sha)}" data-areas="${esc(asArray(c.areas).join(' '))}" data-date="${esc(str(c.date))}" data-expl="${detail ? 1 : 0}">
<summary><input type="checkbox" class="sel" data-sel="changes" value="${esc(c.sha)}" aria-label="Select this change"><span class="ct">${esc(c.title)}</span><span class="small muted cdate">${esc(fmtShort(c.date))}</span><span class="small muted mono">${esc(c.sha)}</span></summary>
<div class="cbody">${detail || '<p class="muted">No further explanation was published for this change.</p>'}<div class="row">${badges(c.areas)}</div></div>
</details>`;
}

function releasePage(r, i) {
  const olderR = releases[i + 1];
  const newerR = releases[i - 1];
  const prev = r.previous_build;
  const n = r.changes.length;
  const headline = r.headline || (r.changes[0] ? r.changes[0].title : `Build ${r.build}`);
  const isNewest = r === newest;
  const sinceLine = prev ? `${plural(n, 'change', 'changes')} since build ${prev}.` : `${plural(n, 'change', 'changes')} in this version.`;
  const areaChips = AREAS.filter((a) => r.areaCounts[a]);
  const hasDemos = r.demos > 0;

  let highlights = '';
  if (r.content && r.highlights.length) {
    highlights = `<section aria-labelledby="hl-h" class="stack">
<h2 id="hl-h" data-yue="精選">Highlights</h2>
<div class="hl-grid">
${r.highlights.map((h) => `<article class="card hl" id="hl-${h.id}">
<div class="row tight">${badges(h.areas)}</div>
<h3>${esc(h.title)}</h3>
${pair(h.what, h.what_yue, 'hwhat')}
${h.why ? `<p class="muted small"><strong data-yue="點解重要：">Why it matters:</strong> ${esc(h.why)}</p>` : ''}
${h.tryIt.length ? `<div class="small"><strong data-yue="試吓">Try it</strong><ol class="try">${h.tryIt.map((t) => `<li>${esc(t)}</li>`).join('')}</ol></div>` : ''}
${h.demoPath ? `<a class="btn filled hl-btn" href="#demo" data-demo-tab="${h.id}" data-yue="喺示範入面試">Try it in the demo</a>` : '<p class="small muted hl-btn" data-yue="暫時未有示範">Demo not available yet</p>'}
</article>`).join('\n')}
</div>
<p class="small muted" data-yue="精選係你用產品時會留意到嘅更改。雜務同紀錄類更改列喺「全部更改」入面。">Highlights are the changes you would notice while using the product. Housekeeping and record-keeping changes are listed under All changes.</p>
</section>`;
  } else if (r.content) {
    highlights = `<section aria-labelledby="hl-h" class="stack"><h2 id="hl-h" data-yue="精選">Highlights</h2><p class="note">${esc(str(r.content.no_feature_note) || 'This version has no change you would notice while using the product.')}</p></section>`;
  } else {
    highlights = `<section aria-labelledby="hl-h" class="stack"><h2 id="hl-h" data-yue="精選">Highlights</h2><p class="note">The written notes for this version are not available yet. The full list of changes is below.</p></section>`;
  }

  let demo = '';
  if (hasDemos) {
    // Each feature contributes its own demo, then any extra demos it lists, one tab each.
    const ds = r.highlights.flatMap((h) => [...(h.demoPath ? [h] : []), ...h.extraDemos]);
    demo = `<section id="demo" class="card demo-sec" aria-labelledby="dm-h">
<div class="dm-head"><div><h2 id="dm-h" data-yue="呢個版本嘅即場示範">Live demo of this version</h2><p class="muted small" data-yue="每項新功能都有可以操作嘅示範，用虛構資料喺你嘅瀏覽器入面行。咩都唔會安裝，咩都唔會儲存。">A working demo of each new feature, run with pretend data in your browser. Nothing is installed and nothing is saved. Each demo shows the feature as it worked in build ${r.build}.</p></div></div>
<div class="tablist" role="tablist" aria-label="Feature to try">
${ds.map((h, k) => `<button type="button" class="chip" role="tab" id="tab-${h.id}" aria-controls="panel-${h.id}" aria-selected="${k === 0}" tabindex="${k === 0 ? 0 : -1}" data-tab="${h.id}">${esc(h.title)}</button>`).join('\n')}
</div>
${ds.map((h, k) => `<div class="tabpanel" role="tabpanel" id="panel-${h.id}" aria-labelledby="tab-${h.id}"${k === 0 ? '' : ' data-later="1"'}>
<div class="note"><strong data-yue="試吓：">What to try:</strong>${h.tryIt.length ? `<ol class="try">${h.tryIt.map((t) => `<li>${esc(t)}</li>`).join('')}</ol>` : ' use the demo below.'}</div>
<div class="demo-frame" data-src="../../${esc(h.demoPath)}" data-title="${esc(h.title)}: demo"><p class="muted" data-yue="撳掣先會載入示範，所以呢頁一路都好輕。">The demo loads when you press the button, so this page stays light.</p></div>
<div class="row"><button type="button" class="filled" data-start data-yue="開始示範">Start the demo</button><a href="../../${esc(h.demoPath)}" data-yue="用獨立頁面打開示範">Open the demo on its own page</a></div>
</div>`).join('\n')}
</section>`;
  } else if (r.content && r.highlights.length) {
    demo = `<section id="demo" class="card demo-sec" aria-labelledby="dm-h"><h2 id="dm-h" data-yue="呢個版本嘅即場示範">Live demo of this version</h2><p class="muted" data-yue="暫時未有示範。">Demo not available yet.</p></section>`;
  }

  const groups = groupChanges(r.changes);
  const all = `<section id="all" class="stack" aria-labelledby="al-h">
<div class="al-head"><h2 id="al-h" data-yue="全部 ${n} 項更改">All ${n} changes</h2>
<div class="inline-search">${findField('chg-q', 'Search the changes', '搜尋更改')}</div></div>
<div class="row">${exportMenu('changes', 'exp-changes')}</div>
${bulkBar('changes', { compare: false })}
${r.truncated ? `<p class="note warn">The change list for this version was shortened by the update feed, so some changes are not shown here.</p>` : ''}
<div class="abars chg-bars" role="group" aria-label="Show only these parts of the product" data-yue-aria="只睇呢啲產品部分">
${areaChips.map((a) => `<button type="button" class="abar" aria-pressed="false" data-area="${a}" style="--w:${Math.max(4, Math.round((r.areaCounts[a] / (n || 1)) * 100))}%"><span class="abar-t"><span class="abar-tick" aria-hidden="true"></span><span data-yue="${esc(areaYue(a))}">${esc(areaLabel(a))}</span></span><b>${r.areaCounts[a]}</b></button>`).join('')}
</div>
<div class="row filter-row chg-tools">
<label class="field grow"><span data-yue="次序">Order</span><select id="chg-sort"><option value="new">Newest first</option><option value="old">Oldest first</option></select></label>
<label class="chk"><input type="checkbox" class="switch" role="switch" id="chg-expl"><span data-yue="只顯示有說明嘅">With an explanation only</span></label>
<button type="button" id="chg-clear" data-yue="清除篩選">Clear filters</button>
</div>
<p class="small muted" id="chg-count" aria-live="polite"></p>
${groups.map(([a, list]) => `<div class="chg-group" data-group="${a}"><h3 data-yue="${esc(a === 'other' ? '其他' : areaYue(a))}">${esc(a === 'other' ? 'Other' : areaLabel(a))}</h3>
${list.map(changeHtml).join('\n')}</div>`).join('\n')}
<div class="note dashed" id="chg-none" hidden><span data-yue="冇更改夾到。清除篩選或者揀另一部分。">No change matches. Clear the filters or choose another part.</span> <button type="button" class="text" id="chg-none-clear" data-yue="清除篩選">Clear filters</button></div>
</section>`;

  const update = `<section id="update" class="card" aria-labelledby="up-h">
<h2 id="up-h" data-yue="點樣更新到第 ${r.build} 版">How to update to build ${r.build}</h2>
<ol class="steps" id="plain-steps">
<li data-yue="更新到 Core ${esc(r.core)}（第 ${r.build} 版）。">Before you start, know the target: Core ${esc(r.core)}, build ${r.build}.</li>
<li data-yue="喺你嘅 Home Assistant Material 開啟「設定」，跟住「系統」，再「更新」。">In your Home Assistant Material, open Settings, then System, then Updates.</li>
<li data-yue="撳「立即檢查」，Core ${esc(r.core)} 就會出現喺清單。">Press Check now. Core ${esc(r.core)} appears in the list.</li>
<li data-yue="揀「更新」。如果呢次更新支援，會先問你要唔要備份。">Choose Update. A backup is offered first when the update supports it.</li>
<li data-yue="更新完成後，檢查更新頁面顯示嘅版本係 Core ${esc(r.core)}。">When it finishes, check that the Updates page shows Core ${esc(r.core)}.</li>
</ol>
<div id="wiz" class="wiz" data-total="5" hidden></div>
<p class="small muted" data-yue="Core、Supervisor 同作業系統永遠唔會自動更新，幾時更新由你決定。">Core, Supervisor and the operating system are never updated automatically. You choose when.</p>
</section>`;

  const nav = `<nav aria-label="Other versions" class="vnav">
${olderR ? `<a class="card small-r navcard" href="../${olderR.build}/"><span class="small muted" data-yue="較舊">Older</span><strong>Build ${olderR.build}</strong><span class="small muted">${esc(fmtDay(olderR.date))}, ${plural(olderR.changes.length, 'change', 'changes')}</span></a>` : '<span></span>'}
${newerR ? `<a class="card small-r navcard tonal" href="../${newerR.build}/"><span class="small muted" data-yue="較新">Newer</span><strong>Build ${newerR.build}</strong><span class="small muted">${esc(fmtDay(newerR.date))}, ${plural(newerR.changes.length, 'change', 'changes')}</span></a>` : ''}
</nav>`;

  const main = `
<section class="hero" aria-labelledby="rp-h">
<div class="row tight">${isNewest ? '<span class="badge hero-badge strong" data-yue="最新版本">Newest version</span>' : ''}<span class="badge hero-badge" data-yue="已發佈">Published release</span></div>
<h1 id="rp-h" class="bigbuild">Build ${r.build}</h1>
<p class="hero-line">Home Assistant Material <span class="mono">${esc(r.core)}</span>, ${esc(fmtLong(r.date))}</p>
${r.headline ? `<p class="hero-headline">${esc(r.headline)}</p>` : ''}
<p>${esc(sinceLine)}</p>
${r.summary ? pair(r.summary, r.summary_yue, 'hero-sum') : ''}
<div class="row">${hasDemos ? '<a class="btn hero-btn strong" href="#demo" data-yue="試新功能">Try the new features</a>' : ''}<a class="btn hero-btn" href="#all" data-yue="睇晒全部 ${n} 項更改">Read all ${n} changes</a></div>
</section>
${isNewest ? stripHtml(r.build) : ''}
<section aria-label="This version in numbers" class="facts">
<div class="fact"><div class="small muted" data-yue="Home Assistant Core">Home Assistant Core</div><div class="mono">${esc(r.core)}</div></div>
<div class="fact"><div class="small muted">Supervisor</div><div class="mono">${esc(r.supervisor)}</div></div>
<div class="fact"><div class="small muted" data-yue="作業系統">Operating system</div><div class="mono">${esc(r.os)}</div></div>
<div class="fact"><div class="small muted" data-yue="原始碼">Source</div><div class="mono">${esc(r.source)}</div></div>
</section>
${highlights}
${demo}
${all}
${update}
${nav}
<p class="small muted">Release tag <span class="mono">${esc(r.tag)}</span> in ${esc(REPOSITORY)}.${byBuild.has(prev) ? ` <a href="../../compare/index.html?from=${prev}&amp;to=${r.build}" data-yue="與第 ${prev} 版比較">Compare with build ${prev}</a>.` : ''}</p>`;
  return layout({
    title: `Build ${r.build}${r.headline ? ': ' + r.headline : ''} - Home Assistant Material updates`,
    description: r.summary || `${sinceLine} Home Assistant Material ${r.core}.`,
    root: '../../', page: 'release', main, path: `releases/${r.build}/`,
  }).replace('<body ', `<body data-build="${r.build}" `);
}

// ---------- Compare page ----------
function comparePage() {
  const main = `
<section class="intro" aria-labelledby="cp-h">
<h1 id="cp-h" class="mega" data-yue="比較兩個版本">Compare two versions</h1>
<p class="muted lead" data-yue="揀兩個版本，睇佢哋有咩分別，以及兩者之間每一項更改。">Choose two versions to see how they differ and every change made between them.</p>
</section>
<section class="card small-r filters" aria-label="Choose versions" data-yue-aria="揀版本">
<div class="row filter-row">
<label class="field grow"><span data-yue="由">From</span><select id="cmp-from"></select></label>
<label class="field grow"><span data-yue="到">To</span><select id="cmp-to"></select></label>
<div class="row">${exportMenu('compare', 'exp-compare')}</div>
</div>
</section>
<div id="cmp-out" aria-live="polite"><p class="note">Choose two versions. The comparison needs JavaScript.</p></div>
<ul class="plain-list">
${releases.map((r) => `<li><a href="../releases/${r.build}/">Build ${r.build}</a> <span class="muted small">${esc(fmtDay(r.date))}, ${plural(r.changes.length, 'change', 'changes')}</span></li>`).join('\n')}
</ul>`;
  return layout({ title: 'Compare versions - Home Assistant Material updates', description: 'Compare any two versions of Home Assistant Material.', root: '../', page: 'compare', main, path: 'compare/' });
}

// ---------- Features pages ----------
const GROUPS = [...new Set(FEATURES.map((f) => f.group))];
const GROUP_YUE = {
  'Language and personalisation': '語言同個人化', 'Look and layout': '外觀同版面', 'Navigation and search': '導覽同搜尋', 'Safety and locks': '安全同鎖',
  'Records and messages': '紀錄同訊息', 'Built-in tools': '內置工具', 'Completeness and evidence': '完整度同憑據', Site: '網站',
};
const stateTag = (s) => `<span class="badge st-${s}" data-yue="${esc(STATE_LABEL_YUE[s])}">${esc(STATE_LABEL[s])}</span>`;
function featuresIndex() {
  const counts = {};
  for (const f of FEATURES) counts[f.state] = (counts[f.state] || 0) + 1;
  const main = `
<section class="intro" aria-labelledby="ft-h">
<h1 id="ft-h" class="mega" data-yue="功能同佢哋嘅真實狀態">Features and their honest state</h1>
<p class="muted lead" data-yue="呢個網站要具備嘅每項功能，列明已經整好、整咗一部分、未整，定係唔適用。冇行過嘅嘢唔會寫成已整好。">Every feature this site owes, with its state: built and run, partly built, not built, or not applicable. Nothing is marked built unless it was run.</p>
<p class="muted small" data-yue="本網站免費，冇廣告、冇追蹤、冇嘢鎖喺付費後面，亦唔會催你做任何嘢。">This site is free: no adverts, no tracking, nothing behind payment, no nagging.</p>
</section>
<section class="stack" aria-label="Filters" data-yue-aria="篩選">
${findField('ft-q', 'Search features', '搜尋功能')}
<div class="row" role="group" aria-label="State" data-yue-aria="狀態">
<button type="button" class="chip" aria-pressed="true" data-state="all"><span data-yue="全部">All</span> <span class="count">${FEATURES.length}</span></button>
${['built', 'partly', 'none', 'na'].map((s) => `<button type="button" class="chip" aria-pressed="false" data-state="${s}"><span data-yue="${esc(STATE_LABEL_YUE[s])}">${esc(STATE_LABEL[s])}</span> <span class="count">${counts[s] || 0}</span></button>`).join('')}
</div>
<p class="small muted" id="ft-count" aria-live="polite"></p>
</section>
<section class="stack" id="ft-list">
${GROUPS.map((g) => `<div class="ft-group" data-group="${esc(g)}"><h2 data-yue="${esc(GROUP_YUE[g] || g)}">${esc(g)}</h2>
${FEATURES.filter((f) => f.group === g).map((f) => `<div class="card small-r ft-row" data-state="${f.state}" data-text="${esc((f.name + ' ' + f.what + ' ' + f.id).toLowerCase())}"><a class="ft-link" href="${esc(f.id)}/"><span class="ft-name"><b data-yue="${esc(f.yue)}">${esc(f.name)}</b> ${stateTag(f.state)}</span><span class="muted small">${esc(f.what)}</span></a><button type="button" class="text tab-open" data-tabhref="${esc(f.id)}/" data-yue="用分頁打開">Open in a tab</button></div>`).join('\n')}</div>`).join('\n')}
</section>`;
  return layout({ title: 'Features - Home Assistant Material updates', description: 'Every feature this site owes, with its honest state.', root: '../', page: 'features', main, path: 'features/' });
}
function featurePage(f) {
  const near = FEATURES.filter((x) => x.group === f.group && x.id !== f.id).slice(0, 4);
  const pagesFor = {
    language: [['../../index.html', 'Home', '主頁'], ['../../settings/index.html#s-lang', 'Settings, Language mode', '設定：語言模式']],
    'personal-vocabulary': [['../../settings/index.html#s-vocab', 'Settings, Your wording', '設定：你嘅用字']],
    exports: [['../../index.html#versions', 'Versions list', '版本清單'], ['../../compare/index.html', 'Compare', '比較']],
    'bulk-actions': [['../../index.html#versions', 'Versions list', '版本清單']],
    notifications: [['../../index.html', 'The bell in the header', '標題列嘅鐘']],
    'command-palette': [['../../index.html', 'Press Ctrl+Shift+F on any page', '喺任何頁面撳 Ctrl+Shift+F']],
    'settings-explanations': [['../../settings/index.html', 'Settings', '設定']],
    'accessibility-sizing': [['../../settings/index.html#s-ts', 'Settings, Text size', '設定：字體大細']],
    'collapse-filters': [['../../index.html#versions', 'Versions, filters', '版本，篩選']],
    'super-confirmation': [['../../settings/index.html#s-reset', 'Settings, Reset everything', '設定：全部還原']],
    'front-provenance': [['../../index.html', 'Home page, under the headline', '主頁，標題下面']],
    'regex-search': [['../../index.html', 'Beside the home search', '主頁搜尋旁邊'], ['../../settings/index.html', 'Beside the settings search', '設定搜尋旁邊']],
    changelog: [['../../index.html', 'Home', '主頁']],
    'live-charts': [['../../index.html#chart', 'Changes per day', '每日更改數目']],
    'funny-emoji': [['../../settings/index.html#s-play', 'Settings, Playfulness', '設定：趣味程度']], 'school-mode': [['../../settings/index.html#s-school', 'Settings, School mode', '設定：學校模式']], narration: [['../../settings/index.html#s-narr', 'Settings, Spoken narrator', '設定：朗讀']], 'scheduled-settings': [['../../settings/index.html#s-sched', 'Settings, Scheduled settings', '設定：定時設定']], 'adhd-modes': [['../../settings/index.html#s-aids', 'Settings, Reading aids', '設定：閱讀輔助']], 'dim-sum': [['../../settings/index.html#s-dimsum', 'Settings, Dim sum surprise', '設定：點心驚喜']], 'appearance-editor': [['../../settings/index.html#s-appear', 'Settings, Appearance editor', '設定：外觀編輯器']], 'color-picker': [['../../settings/index.html#s-picker', 'Settings, Colour picker', '設定：色彩選擇器']], 'logo-customization': [['../../settings/index.html#s-logo', 'Settings, Your logo', '設定：你嘅標誌']], tabs: [['../../index.html#versions', 'Versions, Open in a tab', '版本：用分頁打開']], 'local-history': [['../../settings/index.html#s-hist', 'Settings, History', '設定：紀錄']], 'animation-editor': [['../../settings/index.html#s-anim', 'Settings, Animation', '設定：動畫']], 'element-locks': [['../../settings/index.html#s-locks', 'Settings, Toy locks', '設定：玩具鎖']], 'base64-tools': [['../../tools/base64/index.html', 'Base64 toolkit', 'Base64 工具']], 'file-converter': [['../../tools/convert/index.html', 'File converter', '檔案轉換器']], 'guided-forms': [['../../releases/457/index.html#update', 'Build 457, How to update', '第 457 版：點樣更新']],
  }[f.id] || [];
  const main = `
<article class="article stack" aria-labelledby="fa-h">
<a class="btn text" href="../index.html" data-yue="所有功能">All features</a>
<h1 id="fa-h" class="mega" data-yue="${esc(f.yue)}">${esc(f.name)}</h1>
<div class="row">${stateTag(f.state)}<span class="badge outline" data-yue="${esc(GROUP_YUE[f.group] || f.group)}">${esc(f.group)}</span></div>
<p class="small muted" data-yue="文章暫時只有英文。">Articles are in English for now.</p>
<h2 data-yue="佢係做乜嘅">What it is</h2><p class="lead-p">${esc(f.what)}</p>
<h2 data-yue="喺呢個網站入面">On this site</h2><p class="lead-p">${esc(f.where)}</p>
${pagesFor.length ? `<ul class="plain-list">${pagesFor.map(([h, en, yue]) => `<li><a href="${h}" data-yue="${esc(yue)}">${esc(en)}</a></li>`).join('')}</ul>` : ''}
<h2 data-yue="狀態">State</h2><p class="lead-p">${esc(STATE_LABEL[f.state])}. ${f.state === 'built' ? 'It was written and exercised by the browser test in this repository.' : f.state === 'partly' ? 'The part described under "On this site" exists; the rest is not built.' : f.state === 'none' ? 'It has not been built. This page records the obligation so it is not forgotten.' : 'It cannot apply here, for the reason given under "On this site".'}</p>
${near.length ? `<h2 data-yue="跟住睇">Read next</h2><div class="hl-grid">${near.map((x) => `<a class="card small-r ft-row" href="../${esc(x.id)}/"><span class="ft-name"><b data-yue="${esc(x.yue)}">${esc(x.name)}</b> ${stateTag(x.state)}</span><span class="muted small">${esc(x.what.slice(0, 110))}</span></a>`).join('')}</div>` : ''}
</article>`;
  return layout({ title: `${f.name} - Features - Home Assistant Material updates`, description: f.what, root: '../../', page: 'feature', main, path: `features/${f.id}/` });
}

// ---------- Settings page ----------
function setRow(id, title, titleYue, desc, descYue, def, reach, control, resettable = true) {
  return `<div class="setting" id="s-${id}" data-search="${esc(`${title} ${desc} ${titleYue}`.toLowerCase())}">
<div class="set-text"><span class="set-title"><b data-yue="${esc(titleYue)}">${esc(title)}</b><button type="button" class="pill-icon info" data-info="${id}" aria-expanded="false" aria-controls="i-${id}" aria-label="About this setting: ${esc(title)}" data-yue-aria="關於呢個設定：${esc(titleYue)}">i</button></span>
<span class="muted small" data-yue="${esc(descYue)}">${esc(desc)}</span></div>
<div class="set-ctl row">${control}${resettable ? `<button type="button" class="text" data-reset="${id}" aria-label="Reset: ${esc(title)}" data-yue-aria="還原：${esc(titleYue)}"><span data-yue="還原">Reset</span></button>` : ''}</div>
<div class="set-more small muted" id="i-${id}" hidden><b data-yue="預設：">Default:</b> ${esc(def)}. <b data-yue="影響範圍：">What it reaches:</b> ${esc(reach)}</div>
</div>`;
}
const seg = (key, opts) => `<div class="seg" role="group" aria-label="${esc(key)}">${opts.map(([v, l, y]) => `<button type="button" class="chip" aria-pressed="false" data-set="${key}" data-val="${v}"${y ? ` data-yue="${esc(y)}"` : ''}>${esc(l)}</button>`).join('')}</div>`;
const swc = (key, label) => `<input type="checkbox" class="switch" role="switch" data-switch="${key}" aria-label="${esc(label)}">`;
function settingsPage() {
  const groups = [
    ['Language and wording', '語言同用字', [
      setRow('lang', 'Language mode', '語言模式', 'English, Hong Kong Cantonese, or both together.', '英文、香港廣東話，或者兩種一齊顯示。', 'English', 'Every page and control on this site', seg('lang', [['en', 'English'], ['yue', '廣東話'], ['both', 'Both', '兩種']])),
      setRow('vocab', 'Your wording file', '你嘅用字檔案', 'Load a JSON wording file from your device to replace words on the page. It ships empty.', '由你部機載入 JSON 用字檔案，取代頁面上嘅字詞。預設係空嘅。', 'No file', 'Page text, in this browser only', `<label class="btn tonal"><span data-yue="揀檔案">Choose a file</span><input type="file" id="vocab-file" accept="application/json,.json" hidden></label><button type="button" class="text" id="vocab-clear" data-yue="清除">Clear</button><span class="small muted" id="vocab-state" role="status">No file loaded.</span>`, false),
    ]],
    ['Appearance and accessibility', '外觀同無障礙', [
      setRow('theme', 'Theme', '主題', 'Light, dark, or follow your system.', '淺色、深色，或者跟系統。', 'Follow the system', 'The whole site', seg('theme', [['system', 'System', '跟系統'], ['light', 'Light', '淺色'], ['dark', 'Dark', '深色']])),
      setRow('ts', 'Text size', '字體大細', 'Makes every text larger without cutting anything off.', '放大所有文字，唔會切走內容。', '100%', 'The whole site', seg('ts', [['1', '100%'], ['1.25', '125%'], ['1.5', '150%'], ['2', '200%']])),
      setRow('contrast', 'More contrast', '加強對比', 'Darker text and stronger lines.', '更深嘅文字同更清晰嘅線。', 'Off', 'The whole site', swc('contrast', 'More contrast')),
      setRow('targets', 'Larger targets', '放大掣', 'Bigger buttons and inputs for touch and pointer.', '放大掣同輸入格，方便觸控同滑鼠。', 'Off', 'Buttons and inputs', swc('targets', 'Larger targets')),
      setRow('motion', 'Reduce motion', '減少動態', 'Stops transitions. Your system setting is followed too.', '停止轉場效果。系統設定亦會跟從。', 'Off', 'The whole site', swc('motion', 'Reduce motion')),
    ]],
    ['Messages and records', '訊息同紀錄', [
      setRow('notes', 'Notifications', '通知', 'Messages from this site are kept in the bell until you clear them.', '網站嘅訊息會留喺鐘入面，直到你清除。', 'Kept for this browser', 'The bell in the header', `<span class="small" id="notes-n">0 kept</span><button type="button" id="notes-open" data-yue="打開通知">Open notifications</button><button type="button" id="notes-clear" data-yue="清除通知">Clear notifications</button>`, false),
      setRow('export', 'Export your settings', '匯出你嘅設定', 'Your choices on this site as JSON, CSV, Markdown, plain text or HTML.', '你喺呢個網站嘅選擇，可匯出成 JSON、CSV、Markdown、純文字或 HTML。', '', 'A file you save', FORMATS.filter(([k]) => k !== 'print').map(([k, l]) => `<button type="button" data-export="${k}" data-scope="settings">${l}</button>`).join(''), false),
    ]],
    ['Voice and tone', '聲音同語氣', [
      setRow('play', 'Playfulness', '趣味程度', 'Two sliders, one per language, level 1 to 5, change the tone of this site\'s own wording. Facts and numbers never change.', '兩條滑桿（每種語言一條），1 至 5 級，改變網站自己用字嘅語氣。事實同數字永遠唔變。', 'Level 3 in both languages', 'Headings, buttons, empty states and toasts', '<div class="xctl" data-x="play"></div>', true),
      setRow('emoji', 'Emoji in dialogs and toasts', '對話框同提示表情符號', 'Adds a small emoji to dialog titles and toasts.', '喺對話框標題同提示加細細個表情符號。', 'Off', 'Dialogs and toasts', '<div class="xctl" data-x="emoji"></div>', true),
      setRow('narr', 'Spoken narrator', '朗讀', 'Reads the page aloud with this device\'s voices. Pick a voice per language, the speed and the pitch.', '用你部機嘅聲音朗讀頁面。可以每種語言揀聲音、速度同音高。', 'Off; speed 1, pitch 1', 'The page you are on', '<div class="xctl" data-x="narr"></div>', true),
    ]],
    ['Reading aids and modes', '閱讀輔助同模式', [
      setRow('aids', 'Focus, Calm and Reading aids', '專注、平靜同閱讀輔助', 'Focus hides everything but the main column. Calm stops motion and quiets colours and toasts. Reading widens line spacing and adds a reading ruler. Use them alone or together.', '專注隱藏主欄以外嘅嘢；平靜停止動態、減淡顏色同提示；閱讀加闊行距並加閱讀尺。可以單獨或者一齊用。', 'All off', 'Every page', '<div class="xctl" data-x="aids"></div>', true),
      setRow('school', 'School mode', '學校模式', 'Replaces the product name in the site chrome with a neutral name, sets playfulness to 1, and turns off emoji, the dim sum surprise and narration autoplay.', '將網站介面嘅產品名換成中性名稱、趣味程度設為 1，並關閉表情符號、點心驚喜同自動朗讀。', 'Off; neutral name "Home app"', 'Site chrome and extras', '<div class="xctl" data-x="school"></div>', true),
      setRow('dimsum', 'Dim sum surprise', '點心驚喜', 'Once in a while, at most once per visit, a small card names a dim sum dish. It never shows during a task.', '間唔時（每次瀏覽最多一次）會有張細卡介紹一款點心。做嘢途中唔會出現。', 'On', 'Anywhere except forms, dialogs and demos', '<div class="xctl" data-x="dimsum"></div>', true),
      setRow('sched', 'Scheduled settings', '定時設定', 'Rules that switch language, colours or playfulness between two times on chosen weekdays. Ranges may cross midnight.', '喺指定時間同星期自動轉語言、顏色或趣味程度。時段可以跨越午夜。', 'No rules', 'Language, colours and playfulness', '<div class="xctl" data-x="sched"></div>', true),
    ]],
    ['Look, logo, motion and locks', '外觀、標誌、動態同鎖', [
      setRow('appear', 'Appearance editor', '外觀編輯器', 'Change colours, shape, spacing and type of a kind of element, with undo and redo. Also opens from the context menu.', '改變某類元素嘅顏色、形狀、間距同字體，可還原同重做。亦可以喺右鍵選單打開。', 'No overrides', 'Every page', '<div class="xctl" data-x="appear"></div>', true),
      setRow('picker', 'Colour picker', '色彩選擇器', 'Pick a colour with sliders or typed values, translate between hex, RGB and HSL, and check its contrast.', '用滑桿或者輸入數值揀顏色，喺十六進制、RGB 同 HSL 之間轉換，並檢查對比度。', '', 'A tool; it changes nothing by itself', '<div class="xctl" data-x="picker"></div>', false),
      setRow('logo', 'Your logo', '你嘅標誌', 'Replace the logo in the header with your own image. It is converted in your browser and never uploaded.', '用你自己嘅圖片取代標題列嘅標誌。喺你嘅瀏覽器轉換，唔會上傳。', 'The shipped logo', 'The header', '<div class="xctl" data-x="logo"></div>', true),
      setRow('anim', 'Animation and transitions', '動畫同轉場', 'Tune each kind of motion: on or off, duration, delay, stagger, easing and distance. Reduced motion always wins.', '調整每類動態：開關、時長、延遲、錯開、緩動同距離。減少動態永遠優先。', 'The Standard profile', 'Every page', '<div class="xctl" data-x="anim"></div>', true),
      setRow('locks', 'Toy locks', '玩具鎖', 'Locks you put on page elements with a 4-digit PIN. A speed bump for fun, not security.', '你用 4 位 PIN 鎖住嘅頁面元素。純粹玩玩減速，唔係保安。', 'No locks', 'The elements you locked', '<div class="xctl" data-x="locks"></div>', true),
    ]],
    ['Local history', '本機紀錄', [
      setRow('hist', 'History of your changes', '你嘅更改紀錄', 'Every change to settings, appearance, schedules and the logo is kept here, last 100, with the time. Restore any entry.', '每次更改設定、外觀、定時規則同標誌都會記錄喺度（最近 100 項），附時間。可以還原任何一項。', 'Recording', 'This browser only', '<div class="xctl" data-x="hist"></div>', false),
    ]],
    ['Start again', '重新開始', [
      setRow('reset', 'Reset everything', '全部還原', 'Every choice, kept wording file and notification on this site goes back to the start. This needs two keys and a slider.', '呢個網站所有選擇、用字檔案同通知都會返到起點。需要兩把鑰匙同一個滑桿確認。', '', 'Everything this site keeps in this browser', '<button type="button" class="danger" id="reset-all" data-yue="全部還原">Reset everything</button>', false),
    ]],
  ];
  const main = `
<section class="intro" aria-labelledby="st-h">
<h1 id="st-h" class="mega" data-yue="設定">Settings</h1>
<p class="muted lead" data-yue="每個選擇只會儲存喺呢個瀏覽器。每項設定都會講明作用、預設值同影響範圍，撳資訊掣睇。">Every choice is kept only in this browser. Each setting says what it does, its default and what it reaches; press its info button.</p>
${findField('set-q', 'Search settings', '搜尋設定')}
<p class="small muted" id="set-count" aria-live="polite"></p>
</section>
${groups.map(([t, y, rows], i) => `<section class="card setting-group" aria-labelledby="sg-${i}"><h2 id="sg-${i}" data-yue="${esc(y)}">${esc(t)}</h2>${rows.join('')}</section>`).join('\n')}
<p class="note" id="set-none" hidden data-yue="冇設定夾到。">No setting matches.</p>`;
  return layout({ title: 'Settings - Home Assistant Material updates', description: 'Settings for this site: language, appearance, accessibility, notifications and your own wording file.', root: '../', page: 'settings', main, path: 'settings/' });
}

// ---------- Tools ----------
const btn = (id, label, yue, cls = '') => `<button type="button" id="${id}"${cls ? ` class="${cls}"` : ''} data-yue="${esc(yue)}">${esc(label)}</button>`;
const area = (id, label, yue, extra = '') => `<label class="field"><span data-yue="${esc(yue)}">${esc(label)}</span><textarea id="${id}" rows="6" spellcheck="false" autocomplete="off"${extra}></textarea></label>`;
function toolsIndex() {
  const main = `
<section class="intro" aria-labelledby="tl-h">
<h1 id="tl-h" class="mega" data-yue="工具">Tools</h1>
<p class="muted lead" data-yue="喺瀏覽器入面行嘅細工具。所有嘢都喺你部機處理，咩都唔會上傳。">Small tools that run in your browser. Everything is handled on your device and nothing is uploaded.</p>
</section>
<section class="hl-grid">
<a class="card tool-card" href="base64/index.html"><h2 data-yue="Base64 工具">Base64 toolkit</h2><p class="muted" data-yue="編碼同解碼文字（UTF-8），網址安全版本，檔案同 Base64 互轉。">Encode and decode text (UTF-8), the URL-safe variant, and convert files to and from Base64.</p></a>
<a class="card tool-card" href="convert/index.html"><h2 data-yue="檔案轉換器">File converter</h2><p class="muted" data-yue="圖片 PNG、JPEG、WebP 互轉，文字同 Base64，JSON 同 CSV，JSON 排版。">Convert images between PNG, JPEG and WebP, text and Base64, JSON and CSV, and pretty-print or minify JSON.</p></a>
</section>`;
  return layout({ title: 'Tools - Home Assistant Material updates', description: 'Small tools that run in your browser: Base64 and a file converter.', root: '../', page: 'tools', main, path: 'tools/' });
}
function base64Page() {
  const main = `
<section class="intro" aria-labelledby="b6-h">
<h1 id="b6-h" class="mega" data-yue="Base64 工具">Base64 toolkit</h1>
<p class="muted lead" data-yue="編碼同解碼文字、檔案。全部喺你部機行，咩都唔會上傳。">Encode and decode text and files. It all runs on your device and nothing is uploaded.</p>
</section>
<section class="card stack tool" aria-labelledby="b6-t">
<h2 id="b6-t" data-yue="文字">Text</h2>
${area('b64-in', 'Text, or Base64 to decode', '文字，或者要解碼嘅 Base64')}
<div class="row">${btn('b64-enc', 'Encode to Base64', '編碼成 Base64', 'filled')}${btn('b64-dec', 'Decode from Base64', '由 Base64 解碼')}
<label class="check"><input type="checkbox" id="b64-url"> <span data-yue="網址安全（- 同 _）">URL-safe (- and _)</span></label>
<label class="check"><input type="checkbox" id="b64-pad" checked> <span data-yue="保留 = 補位">Keep = padding</span></label></div>
<p id="b64-valid" class="small" role="status" aria-live="polite"></p>
${area('b64-out', 'Result', '結果', ' readonly')}
<p id="b64-size" class="small muted"></p>
<div class="row">${btn('b64-copy', 'Copy result', '複製結果')}${btn('b64-dl', 'Download result as a text file', '下載結果做文字檔')}${btn('b64-swap', 'Use the result as input', '將結果當輸入')}${btn('b64-clear', 'Clear', '清除', 'text')}</div>
</section>
<section class="card stack tool" aria-labelledby="b6-f">
<h2 id="b6-f" data-yue="檔案轉 Base64">File to Base64</h2>
<label class="field"><span data-yue="揀一個檔案（最大 8 MB）">Choose a file (up to 8 MB)</span><input type="file" id="b64-file"></label>
<p id="b64-file-info" class="small muted" role="status"></p>
${area('b64-file-out', 'Base64 of the file', '檔案嘅 Base64', ' readonly')}
<div class="row">${btn('b64-file-copy', 'Copy', '複製')}${btn('b64-file-dl', 'Download as a text file', '下載做文字檔')}</div>
</section>
<section class="card stack tool" aria-labelledby="b6-g">
<h2 id="b6-g" data-yue="Base64 轉檔案">Base64 to file</h2>
${area('b64-tofile-in', 'Base64 to turn into a file', '要變成檔案嘅 Base64')}
<div class="row"><label class="field grow"><span data-yue="檔案名稱">File name</span><input type="text" id="b64-tofile-name" value="decoded.bin"></label></div>
<p id="b64-tofile-valid" class="small" role="status" aria-live="polite"></p>
<div class="row">${btn('b64-tofile-dl', 'Download the file', '下載檔案', 'filled')}</div>
</section>`;
  return layout({ title: 'Base64 toolkit - Home Assistant Material updates', description: 'Encode and decode Base64 text and files in your browser.', root: '../../', page: 'tool-base64', main, path: 'tools/base64/' });
}
function convertPage() {
  const main = `
<section class="intro" aria-labelledby="cv-h">
<h1 id="cv-h" class="mega" data-yue="檔案轉換器">File converter</h1>
<p class="muted lead" data-yue="只做瀏覽器真正做得到嘅轉換。每個轉換都會講明限制，咩都唔會上傳。">Only the conversions a browser can honestly do. Each one states its limits, and nothing is uploaded.</p>
</section>
<section class="card stack tool" aria-labelledby="cv-t">
<h2 id="cv-t" data-yue="揀轉換">Choose a conversion</h2>
<label class="field"><span data-yue="轉換">Conversion</span><select id="cv-mode"><option value="image">Image: PNG, JPEG or WebP</option><option value="text64">Text: UTF-8 and Base64</option><option value="j2c">JSON to CSV</option><option value="c2j">CSV to JSON</option><option value="jfmt">JSON: pretty-print or minify</option></select></label>
<p id="cv-limit" class="note"></p>
<div id="cv-image" class="stack" data-mode="image">
<label class="field"><span data-yue="圖片檔案">Image file</span><input type="file" id="cv-img-file" accept="image/png,image/jpeg,image/webp"></label>
<div class="row"><label class="field"><span data-yue="輸出格式">Output format</span><select id="cv-img-fmt"><option value="image/png">PNG</option><option value="image/jpeg">JPEG</option><option value="image/webp">WebP</option></select></label>
<label class="field grow"><span data-yue="品質">Quality <output id="cv-q-out">0.9</output></span><input type="range" id="cv-img-q" min="0.1" max="1" step="0.05" value="0.9"></label></div>
${btn('cv-img-go', 'Convert', '轉換', 'filled')}
<p id="cv-img-info" class="small" role="status" aria-live="polite"></p>
<div id="cv-img-prev" class="cv-prev"></div>
</div>
<div id="cv-text64" class="stack" data-mode="text64" hidden>
${area('cv-t-in', 'Input', '輸入')}
<div class="row">${btn('cv-t-enc', 'UTF-8 text to Base64', 'UTF-8 文字轉 Base64', 'filled')}${btn('cv-t-dec', 'Base64 to UTF-8 text', 'Base64 轉 UTF-8 文字')}</div>
${area('cv-t-out', 'Output', '輸出', ' readonly')}
</div>
<div id="cv-j2c" class="stack" data-mode="j2c" hidden>
${area('cv-j-in', 'JSON: a list of objects', 'JSON：物件清單', ' placeholder="[{&quot;name&quot;:&quot;a&quot;,&quot;n&quot;:1}]"')}
${btn('cv-j-go', 'Convert to CSV', '轉成 CSV', 'filled')}
${area('cv-j-out', 'CSV', 'CSV', ' readonly')}
</div>
<div id="cv-c2j" class="stack" data-mode="c2j" hidden>
${area('cv-c-in', 'CSV with a header row', '有標題行嘅 CSV')}
${btn('cv-c-go', 'Convert to JSON', '轉成 JSON', 'filled')}
${area('cv-c-out', 'JSON', 'JSON', ' readonly')}
</div>
<div id="cv-jfmt" class="stack" data-mode="jfmt" hidden>
${area('cv-f-in', 'JSON', 'JSON')}
<div class="row">${btn('cv-f-pretty', 'Pretty-print', '排版', 'filled')}${btn('cv-f-min', 'Minify', '壓縮')}<label class="field"><span data-yue="縮排">Indent</span><select id="cv-f-ind"><option>2</option><option>4</option><option value="tab">Tab</option></select></label></div>
${area('cv-f-out', 'Result', '結果', ' readonly')}
</div>
<p id="cv-msg" class="small" role="status" aria-live="polite"></p>
<div class="row">${btn('cv-copy', 'Copy the text result', '複製文字結果')}${btn('cv-dl', 'Download the result', '下載結果')}</div>
</section>`;
  return layout({ title: 'File converter - Home Assistant Material updates', description: 'Convert images, text, JSON and CSV in your browser.', root: '../../', page: 'tool-convert', main, path: 'tools/convert/' });
}

function notFoundPage() {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Page not found - Home Assistant Material updates</title>
<style>body{font-family:system-ui,sans-serif;margin:0;padding:24px;line-height:1.5;background:#eef1f6;color:#181c20}main{max-width:40rem;margin:0 auto}a{color:#00639b;display:inline-flex;min-height:48px;align-items:center}@media (prefers-color-scheme:dark){body{background:#0b0f13;color:#e0e2e8}a{color:#98cbff}}</style></head>
<body><main><h1>Page not found</h1><p>This page does not exist. It may have moved.</p><p><a id="home" href="index.html">All versions</a></p></main>
<script>(function(){var h=document.getElementById('home');var p=location.pathname.split('/').filter(Boolean);if(location.hostname.slice(-9)==='github.io'&&p.length){h.setAttribute('href','/'+p[0]+'/')}else{h.setAttribute('href','/')}})();</script></body></html>
`;
}

// ---------- Search index ----------
function searchIndex() {
  return {
    generated: data.generated || null,
    versions: releases.map((r) => ({
      b: r.build, core: r.core, source: r.source, date: r.date, day: r.day, h: r.headline, s: r.summary, sy: r.summary_yue,
      hl: r.highlights.map((h) => ({ t: h.title, w: h.what, wy: h.what_yue, y: h.why })),
      ch: r.changes.map((c) => ({ s: c.sha, t: c.title, d: str(c.detail), dy: str(c.detail_yue), a: asArray(c.areas) })),
    })),
  };
}

function paletteItems() {
  const items = [
    { kind: 'Page', label: 'All versions', yue: '所有版本', href: 'index.html#versions' }, { kind: 'Page', label: 'Calendar', yue: '日曆', href: 'index.html#calendar' },
    { kind: 'Page', label: 'Compare versions', yue: '比較版本', href: 'compare/index.html' }, { kind: 'Page', label: 'Features and their state', yue: '功能同狀態', href: 'features/index.html' },
    { kind: 'Page', label: 'Settings', yue: '設定', href: 'settings/index.html' }, { kind: 'Page', label: 'Tools', yue: '工具', href: 'tools/index.html' }, { kind: 'Page', label: 'Base64 toolkit', yue: 'Base64 工具', href: 'tools/base64/index.html' }, { kind: 'Page', label: 'File converter', yue: '檔案轉換器', href: 'tools/convert/index.html' },
  ];
  for (const r of releases) items.push({ kind: 'Version', label: `Build ${r.build}${r.headline ? ': ' + r.headline : ''}`, yue: `第 ${r.build} 版`, href: `releases/${r.build}/`, sub: r.core });
  for (const f of FEATURES) items.push({ kind: 'Feature', label: f.name, yue: f.yue, href: `features/${f.id}/`, sub: f.what });
  for (const [id, label, yue] of [['lang', 'Language mode', '語言模式'], ['vocab', 'Your wording file', '你嘅用字檔案'], ['theme', 'Theme', '主題'], ['ts', 'Text size', '字體大細'], ['contrast', 'More contrast', '加強對比'], ['targets', 'Larger targets', '放大掣'], ['motion', 'Reduce motion', '減少動態'], ['notes', 'Notifications', '通知'], ['export', 'Export your settings', '匯出你嘅設定'], ['play', 'Playfulness', '趣味程度'], ['emoji', 'Emoji in dialogs and toasts', '表情符號'], ['narr', 'Spoken narrator', '朗讀'], ['aids', 'Focus, Calm and Reading aids', '專注、平靜同閱讀輔助'], ['school', 'School mode', '學校模式'], ['dimsum', 'Dim sum surprise', '點心驚喜'], ['sched', 'Scheduled settings', '定時設定'], ['appear', 'Appearance editor', '外觀編輯器'], ['picker', 'Colour picker', '色彩選擇器'], ['logo', 'Your logo', '你嘅標誌'], ['anim', 'Animation and transitions', '動畫同轉場'], ['locks', 'Toy locks', '玩具鎖'], ['hist', 'History of your changes', '更改紀錄'], ['reset', 'Reset everything', '全部還原']]) items.push({ kind: 'Setting', label, yue, href: `settings/index.html#s-${id}` });
  return items;
}

// ---------- Write ----------
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync(join(ROOT, 'assets'), join(OUT, 'assets'), { recursive: true });
if (existsSync(join(ROOT, 'demos'))) cpSync(join(ROOT, 'demos'), join(OUT, 'demos'), { recursive: true });
mkdirSync(join(OUT, 'data'), { recursive: true });
cpSync(join(ROOT, 'data', 'changes.json'), join(OUT, 'data', 'changes.json'));
writeFileSync(join(OUT, 'data', 'search.json'), JSON.stringify(searchIndex()));
writeFileSync(join(OUT, 'data', 'pages.json'), JSON.stringify({ items: paletteItems() }));
writeFileSync(join(OUT, 'assets', 'icon.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="18" fill="#00639b"/><path d="M12 34 32 14l20 20v16H38V38H26v12H12z" fill="#fff"/></svg>');
write('index.html', homePage());
releases.forEach((r, i) => write(`releases/${r.build}/index.html`, releasePage(r, i)));
write('compare/index.html', comparePage());
write('features/index.html', featuresIndex());
FEATURES.forEach((f) => write(`features/${f.id}/index.html`, featurePage(f)));
write('settings/index.html', settingsPage());
write('tools/index.html', toolsIndex());
write('tools/base64/index.html', base64Page());
write('tools/convert/index.html', convertPage());
write('404.html', notFoundPage());
writeFileSync(join(OUT, '.nojekyll'), '');

const withContent = releases.filter((r) => r.content).map((r) => r.build);
console.log(`Built ${releases.length} version pages, home, compare and 404 into _site/.`);
console.log(`Versions with written content: ${withContent.length ? withContent.sort((a, b) => a - b).join(', ') : 'none'}.`);
console.log(`Demos found: ${releases.reduce((s, r) => s + r.demoCount, 0)}.`);
