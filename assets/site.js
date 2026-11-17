/* Home Assistant Material updates. One script for every page: language modes, settings, search with a
   pattern builder, filters, calendar, chart, comparison, exports, bulk actions, notifications, the command
   palette, tabs for demos and the "Update coming soon" strip. No dependencies, no cookies.
   Network: this site's own files, and two public GitHub API addresses for the strip. Nothing else. */
(() => {
  'use strict';
  const doc = document;
  const html = doc.documentElement;
  const body = doc.body;
  const ROOT = new URL(body.getAttribute('data-root') || './', location.href).href;
  const PAGE = body.getAttribute('data-page') || '';
  html.classList.add('js');

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const AREAS = { interface: 'Interface', core: 'Core', supervisor: 'Supervisor', os: 'Operating system', deploy: 'Deploy Assistant', docs: 'Documentation', design: 'Design', build: 'Build' };
  const AREAS_YUE = { interface: '介面', core: '核心', supervisor: 'Supervisor', os: '作業系統', deploy: '部署助手', docs: '文件', design: '設計', build: '建置' };
  const AREA_ORDER = Object.keys(AREAS);

  // ---------- Helpers ----------
  const $ = (s, c) => (c || doc).querySelector(s);
  const $$ = (s, c) => Array.prototype.slice.call((c || doc).querySelectorAll(s));
  const pad = (n) => (n < 10 ? '0' : '') + n;
  function h(tag, attrs, ...kids) {
    const e = doc.createElement(tag);
    if (attrs) {
      for (const k of Object.keys(attrs)) {
        const v = attrs[k];
        if (v === false || v == null) continue;
        if (k === 'text') e.textContent = v;
        else if (k === 'class') e.className = v;
        else e.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const kid of kids) {
      if (kid == null || kid === false) continue;
      e.appendChild(typeof kid === 'string' ? doc.createTextNode(kid) : kid);
    }
    return e;
  }
  const store = {
    get(area, k) { try { return window[area].getItem(k); } catch (e) { return null; } },
    set(area, k, v) { try { window[area].setItem(k, v); } catch (e) { /* storage may be blocked */ } },
  };
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  function parts(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso || '');
    return m ? { y: +m[1], mo: +m[2], d: +m[3], h: m[4], mi: m[5], day: `${m[1]}-${m[2]}-${m[3]}` } : null;
  }
  const fmtDay = (day) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day); return m ? `${+m[3]} ${MONTHS[+m[2] - 1]} ${m[1]}` : day; };
  const fmtDayYue = (day) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day); return m ? `${m[1]}年${+m[2]}月${+m[3]}日` : day; };
  const fmtLong = (iso) => { const p = parts(iso); return p ? `${p.d} ${MONTHS[p.mo - 1]} ${p.y} at ${p.h}:${p.mi}` : ''; };
  const fmtShort = (iso) => { const p = parts(iso); return p ? `${p.d} ${MONTHS[p.mo - 1].slice(0, 3)}, ${p.h}:${p.mi}` : ''; };
  const monthLabel = (ym) => { const [y, m] = ym.split('-'); return `${MONTHS[+m - 1]} ${y}`; };
  const monthLabelYue = (ym) => { const [y, m] = ym.split('-'); return `${y}年${+m}月`; };
  const addMonths = (ym, n) => { const [y, m] = ym.split('-').map(Number); const t = y * 12 + (m - 1) + n; return `${Math.floor(t / 12)}-${pad((t % 12) + 1)}`; };
  const addDays = (day, n) => { const [y, m, d] = day.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d + n)); return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`; };
  const getJson = (url) => fetch(url).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); });
  const tokens = (q) => String(q || '').toLowerCase().split(/\s+/).filter(Boolean);

  // ---------- Language ----------
  let lang = html.getAttribute('data-lang') || 'en';
  /** A message in the chosen language. */
  const T = (en, yue) => { if (window.HX_TONE) { const r = window.HX_TONE(en, yue); en = r[0]; yue = r[1]; } return lang === 'yue' ? yue : lang === 'both' ? `${en} / ${yue}` : en; };
  const LANGS = [['en', 'English'], ['yue', 'Cantonese'], ['both', 'English and Cantonese']];
  const LANG_LABEL_YUE = { en: '英文', yue: '廣東話', both: '兩種語言' };
  function applyLang(root) {
    root = root || doc;
    const els = (root.querySelectorAll ? $$('[data-yue],[data-yue-aria],[data-yue-ph]', root) : []);
    if (root.matches && root.matches('[data-yue],[data-yue-aria],[data-yue-ph]')) els.push(root);
    for (const e of els) {
      if (e.hasAttribute('data-yue')) {
        if (e.dataset.en === undefined) e.dataset.en = e.textContent;
        const en = e.dataset.en; const yue = e.getAttribute('data-yue');
        e.textContent = '';
        if (lang === 'yue') e.textContent = yue;
        else if (lang === 'both') { e.appendChild(doc.createTextNode(en)); e.appendChild(h('span', { class: 'l2', lang: 'yue', text: yue })); } else e.textContent = en;
        if (lang === 'yue') e.setAttribute('lang', 'yue'); else if (e.getAttribute('lang') === 'yue') e.removeAttribute('lang');
      }
      if (e.hasAttribute('data-yue-aria')) {
        if (e.dataset.enAria === undefined) e.dataset.enAria = e.getAttribute('aria-label') || '';
        const en = e.dataset.enAria; const yue = e.getAttribute('data-yue-aria');
        e.setAttribute('aria-label', lang === 'yue' ? yue : lang === 'both' ? `${en} / ${yue}` : en);
      }
      if (e.hasAttribute('data-yue-ph')) {
        if (e.dataset.enPh === undefined) e.dataset.enPh = e.getAttribute('placeholder') || '';
        const en = e.dataset.enPh; const yue = e.getAttribute('data-yue-ph');
        e.setAttribute('placeholder', lang === 'yue' ? yue : lang === 'both' ? `${en} / ${yue}` : en);
      }
    }
  }
  function setLang(next, quiet) {
    lang = next;
    if (lang === 'en') html.removeAttribute('data-lang'); else html.setAttribute('data-lang', lang);
    html.lang = lang === 'yue' ? 'yue' : 'en';
    store.set('sessionStorage', 'hamu-lang', lang);
    applyLang(doc);
    paintSwitches();
    applyVocab(doc.body);
    window.dispatchEvent(new CustomEvent('hamu-lang'));
    if (!quiet) toast(T('Language: ' + LANGS.find((l) => l[0] === lang)[1], '語言：' + LANG_LABEL_YUE[lang]));
  }

  // ---------- Settings (kept in this browser only) ----------
  const SET_KEY = 'hamu-set';
  const SET_DEF = { theme: 'system', ts: 1, contrast: false, targets: false, motion: false, vocab: null };
  let SET = Object.assign({}, SET_DEF);
  try { Object.assign(SET, JSON.parse(store.get('localStorage', SET_KEY) || '{}')); } catch (e) { /* ignore */ }
  const saveSet = () => { store.set('localStorage', SET_KEY, JSON.stringify(SET)); if (window.HX_REC) window.HX_REC('Settings'); };
  function applySet() {
    if (SET.theme === 'light' || SET.theme === 'dark') html.setAttribute('data-theme', SET.theme); else html.removeAttribute('data-theme');
    if (SET.ts > 1) html.style.setProperty('--ts', String(SET.ts)); else html.style.removeProperty('--ts');
    html.classList.toggle('hc', !!SET.contrast); html.classList.toggle('big', !!SET.targets); html.classList.toggle('calm', !!SET.motion);
    paintSwitches();
  }
  const THEMES = [['system', 'System colours', '跟系統顏色', 'follow the system', '跟系統'], ['light', 'Light colours', '淺色', 'light', '淺色'], ['dark', 'Dark colours', '深色', 'dark', '深色']];
  function paintSwitches() {
    const lb = $('#lang-btn'); const tb = $('#theme-btn');
    if (lb) {
      const l = LANGS.find((x) => x[0] === lang);
      lb.textContent = lang === 'yue' ? '廣東話' : lang === 'both' ? 'English + 廣東話' : l[1];
      lb.setAttribute('aria-label', T(`Language: ${l[1]}. Change language`, `語言：${LANG_LABEL_YUE[lang]}。轉換語言`));
    }
    if (tb) {
      const t = THEMES.find((x) => x[0] === SET.theme) || THEMES[0];
      tb.textContent = lang === 'yue' ? t[2] : t[1];
      tb.setAttribute('aria-label', T(`Colours: ${t[3]}. Change`, `顏色：${t[4]}。轉換`));
    }
    // settings page controls
    for (const b of $$('[data-set]')) {
      const k = b.dataset.set; const cur = k === 'lang' ? lang : String(SET[k]);
      b.setAttribute('aria-pressed', String(cur === b.dataset.val));
    }
    for (const s of $$('[data-switch]')) s.checked = !!SET[s.dataset.switch];
  }

  // ---------- Notifications ----------
  const NOTE_KEY = 'hamu-notes';
  let notes = [];
  try { notes = JSON.parse(store.get('localStorage', NOTE_KEY) || '[]'); if (!Array.isArray(notes)) notes = []; } catch (e) { notes = []; }
  function paintBell() {
    const n = $('#bell-n'); const unread = notes.filter((x) => !x.read).length;
    if (n) { n.textContent = String(unread); n.hidden = !unread; }
    const c = $('#notes-n'); if (c) c.textContent = T(`${notes.length} kept`, `保留咗 ${notes.length} 項`);
  }
  function toast(text, opts) {
    opts = opts || {};
    if (window.HX_TOAST) { text = window.HX_TOAST(text, opts); if (!text) return; }
    const box = $('#toasts');
    if (box) {
      const el = h('div', { class: 'toast', role: 'status' }, h('span', { text }), h('button', { type: 'button', class: 'icon', 'aria-label': T('Dismiss', '關閉'), text: '×' }));
      $('button', el).addEventListener('click', () => el.remove());
      box.appendChild(el);
      setTimeout(() => el.remove(), 4500);
    }
    if (!opts.silent) { notes.unshift({ t: Date.now(), text, read: false }); notes = notes.slice(0, 50); store.set('localStorage', NOTE_KEY, JSON.stringify(notes)); paintBell(); }
  }

  // ---------- Dialogs ----------
  let dlgOrigin = null;
  function closeDialog() {
    const o = $('#ov'); if (!o) return;
    o.remove();
    if (dlgOrigin && doc.body.contains(dlgOrigin)) dlgOrigin.focus();
  }
  function dialog(title, content, opts) {
    opts = opts || {};
    closeDialog();
    dlgOrigin = doc.activeElement;
    const box = h('div', { class: 'dialog', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'dlg-t', tabindex: '-1' },
      h('header', null, h('h2', { id: 'dlg-t', text: window.HX_DLG ? window.HX_DLG(title) : title }), h('button', { type: 'button', class: 'icon', 'data-close': '1', 'aria-label': T('Close', '閂'), text: '×' })));
    box.appendChild(content);
    const ov = h('div', { class: 'overlay', id: 'ov' }, box);
    ov.addEventListener('mousedown', (e) => { if (e.target === ov) closeDialog(); });
    box.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeDialog(); });
    ov.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); closeDialog(); }
      if (e.key === 'Tab') {
        const f = $('button,input,select:not(.cb-native),textarea,a[href],[tabindex="0"]', box).filter((x) => !x.disabled && x.offsetParent !== null);
        if (!f.length) return;
        const first = f[0]; const last = f[f.length - 1];
        if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    body.appendChild(ov);
    applyLang(ov);
    const f = opts.focus ? $(opts.focus, box) : $('input,select:not(.cb-native),textarea,button:not([data-close])', box);
    (f || box).focus();
    return box;
  }

  // ---------- Search: plain words, or /pattern/flags ----------
  function compile(q) {
    q = String(q || '').trim();
    if (!q) return { none: true, ok: true, test: () => true, ranges: () => [] };
    const m = /^\/(.+)\/([dgimsuvy]*)$/.exec(q);
    if (m) {
      try {
        const flags = m[2].replace(/[gy]/g, '');
        const re = new RegExp(m[1], flags);
        const g = new RegExp(m[1], flags + 'g');
        return {
          ok: true, regex: true, q,
          test: (t) => re.test(String(t).slice(0, 20000)),
          ranges: (t) => { const out = []; g.lastIndex = 0; let r; let n = 0; const s = String(t).slice(0, 20000); while ((r = g.exec(s)) && n++ < 200) { if (r[0] === '') { g.lastIndex++; continue; } out.push([r.index, r.index + r[0].length]); } return out; },
        };
      } catch (e) { return { ok: false, error: e.message, q, test: () => false, ranges: () => [] }; }
    }
    const toks = tokens(q);
    return {
      ok: true, toks, q,
      test: (t) => { const l = String(t).toLowerCase(); return toks.every((k) => l.indexOf(k) >= 0); },
      ranges: (t) => { const l = String(t).toLowerCase(); const out = []; for (const k of toks) { let i = l.indexOf(k); while (i !== -1) { out.push([i, i + k.length]); i = l.indexOf(k, i + k.length); } } return out; },
    };
  }
  /** Text with every match wrapped in <mark>. */
  function marked(text, mt) {
    const frag = doc.createDocumentFragment();
    const rs = mt && !mt.none && mt.ok ? mt.ranges(text) : [];
    if (!rs.length) { frag.appendChild(doc.createTextNode(text)); return frag; }
    const flags = new Array(text.length).fill(false);
    for (const [a, b] of rs) for (let k = a; k < b; k++) flags[k] = true;
    let i = 0;
    while (i < text.length) {
      let j = i;
      while (j < text.length && flags[j] === flags[i]) j++;
      const piece = text.slice(i, j);
      frag.appendChild(flags[i] ? h('mark', { text: piece }) : doc.createTextNode(piece));
      i = j;
    }
    return frag;
  }
  function searchError(input, mt) {
    const par = input.parentNode; if (!par) return;
    let e = par.querySelector('.field-err');
    if (!mt.ok) {
      if (!e) { e = h('span', { class: 'field-err', role: 'alert' }); par.appendChild(e); }
      e.textContent = T('That pattern does not work: ', '呢個樣式用唔到：') + mt.error;
    } else if (e) e.remove();
  }

  // ---------- Pattern builder (beside every search) ----------
  const BLOCKS = [['\\b', 'Word edge', '字邊'], ['\\w+', 'Letters or digits', '字母或數字'], ['\\d', 'A digit', '一個數字'], ['\\s', 'Space', '空格'], ['.', 'Any character', '任何字元'], ['^', 'Start', '開頭'], ['$', 'End', '結尾'], ['( )', 'Group', '分組'], ['[ ]', 'Any one of', '其中一個'], ['|', 'Or', '或者'], ['*', 'Zero or more', '零個或以上'], ['+', 'One or more', '一個或以上']];
  const EXPLAIN = { '\\b': 'a word edge', '\\B': 'not a word edge', '\\d': 'a digit', '\\D': 'not a digit', '\\w': 'a letter, digit or underscore', '\\W': 'not a letter or digit', '\\s': 'a space', '\\S': 'not a space', '.': 'any character', '^': 'the start', '$': 'the end', '|': 'or', '*': 'repeat 0 or more times', '+': 'repeat 1 or more times', '?': 'optional', '(': 'start a group', ')': 'end a group' };
  function explainRe(p) {
    const out = []; let i = 0;
    while (i < p.length) {
      const two = p.substr(i, 2);
      if (EXPLAIN[two]) { out.push([two, EXPLAIN[two]]); i += 2; continue; }
      if (p[i] === '\\') { out.push([two, `the character ${p[i + 1] || ''}`]); i += 2; continue; }
      if (p[i] === '[') { let j = p.indexOf(']', i + 1); if (j < 0) j = p.length - 1; out.push([p.slice(i, j + 1), 'one of these characters']); i = j + 1; continue; }
      if (p[i] === '{') { let k = p.indexOf('}', i); if (k < 0) k = p.length - 1; out.push([p.slice(i, k + 1), 'repeat this many times']); i = k + 1; continue; }
      if (EXPLAIN[p[i]]) { out.push([p[i], EXPLAIN[p[i]]]); i++; continue; }
      const s = i; while (i < p.length && /[^\\.^$|*+?()[\]{}]/.test(p[i])) i++;
      out.push([p.slice(s, i), `the letters ${p.slice(s, i)}`]);
    }
    return out;
  }
  function openWorkbench(targetId) {
    const target = targetId ? doc.getElementById(targetId) : null;
    const cur = target ? target.value : '';
    const mm = /^\/(.+)\/([dgimsuvy]*)$/.exec(cur);
    let pat = mm ? mm[1] : cur.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
    let flags = mm ? mm[2].replace(/[gy]/g, '') : 'i';
    const sample = target && target.dataset.sample ? target.dataset.sample : 'Camera recording around the clock\nSettings search finds pages inside the cards\nBuild 457, 2026-11-16';
    const patIn = h('input', { id: 'wb-pat', type: 'text', class: 'mono', autocomplete: 'off', spellcheck: 'false', value: pat, 'aria-label': T('Pattern', '樣式') });
    const err = h('p', { class: 'field-err', role: 'alert' });
    const flagBox = h('div', { class: 'row', role: 'group', 'aria-label': T('Flags', '旗標') });
    const FL = [['i', 'Ignore case', '唔理大細寫'], ['m', 'Multi-line', '多行'], ['s', 'Dot matches line breaks', '點號包括換行'], ['u', 'Unicode', 'Unicode'], ['d', 'Match indices', '位置索引']];
    const flagBtns = FL.map(([f, en, yue]) => { const b = h('button', { type: 'button', class: 'chip', 'aria-pressed': String(flags.indexOf(f) >= 0), text: `${f} ${T(en, yue)}` }); b.addEventListener('click', () => { flags = flags.indexOf(f) >= 0 ? flags.replace(f, '') : flags + f; b.setAttribute('aria-pressed', String(flags.indexOf(f) >= 0)); upd(); }); flagBox.appendChild(b); return b; });
    void flagBtns;
    const blocks = h('div', { class: 'row' }, ...BLOCKS.map(([b, en, yue]) => { const btn = h('button', { type: 'button', class: 'chip', text: `${b}  ${T(en, yue)}` }); btn.addEventListener('click', () => { const s = patIn.selectionStart == null ? patIn.value.length : patIn.selectionStart; const e = patIn.selectionEnd == null ? s : patIn.selectionEnd; patIn.value = patIn.value.slice(0, s) + b + patIn.value.slice(e); patIn.focus(); upd(); }); return btn; }));
    const text = h('textarea', { id: 'wb-text', 'aria-label': T('Test text', '測試文字') }, sample);
    const count = h('p', { class: 'small', 'aria-live': 'polite' });
    const hits = h('pre', { class: 'wb-hits' });
    const exp = h('div', { class: 'row wb-exp' });
    const value = h('p', { class: 'small mono wb-value' });
    function upd() {
      pat = patIn.value; err.textContent = '';
      let re = null;
      try { re = new RegExp(pat, flags.replace(/[gy]/g, '') + 'g'); } catch (e) { err.textContent = T('This pattern does not work: ', '呢個樣式用唔到：') + e.message; }
      hits.textContent = ''; exp.textContent = '';
      value.textContent = pat ? `/${pat}/${flags}` : '';
      if (re && pat) {
        const t = text.value.slice(0, 20000); let n = 0; let last = 0; let r; let guard = 0;
        while ((r = re.exec(t)) && guard++ < 1000) { if (r[0] === '') { re.lastIndex++; continue; } n++; hits.appendChild(doc.createTextNode(t.slice(last, r.index))); hits.appendChild(h('mark', { text: r[0] })); last = r.index + r[0].length; }
        hits.appendChild(doc.createTextNode(t.slice(last)));
        count.textContent = T(`${plural(n, 'match', 'matches')}`, `${n} 個配對`);
        for (const [tok, what] of explainRe(pat)) exp.appendChild(h('span', { class: 'tok' }, h('b', { class: 'mono', text: tok }), ' ', what));
      } else { hits.textContent = text.value; count.textContent = pat ? '' : T('Type a pattern to see matches.', '輸入樣式就會睇到配對。'); }
    }
    const use = h('button', { type: 'button', class: 'filled', text: T('Use this pattern', '用呢個樣式') });
    use.addEventListener('click', () => { if (!target || err.textContent) return; const v = `/${patIn.value}/${flags}`; closeDialog(); target.value = v; target.dispatchEvent(new Event('input', { bubbles: true })); target.focus(); });
    const copy = h('button', { type: 'button', class: 'text', text: T('Copy', '複製') });
    copy.addEventListener('click', () => { const v = `/${patIn.value}/${flags}`; (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(() => toast(T('Copied.', '複製咗。')), () => toast(T('Copying is not available here.', '呢度用唔到複製。'))); });
    const box = h('div', { class: 'stack' },
      h('p', { class: 'small muted', text: target ? T('Opened from a search. The pattern goes back there when you choose Use.', '由搜尋開啟。撳「用呢個樣式」就會放返落搜尋格。') : T('Build and test a regular expression.', '建構同測試正則表達式。') }),
      h('label', { class: 'field' }, h('span', { text: T('Pattern', '樣式') }), patIn), err, flagBox,
      h('details', { open: '' }, h('summary', { text: T('Building blocks', '組件') }), blocks),
      h('label', { class: 'field' }, h('span', { text: T('Test text', '測試文字') }), text),
      count, hits, h('p', { class: 'small', text: T('How it reads', '點樣解讀') }), exp, value,
      h('div', { class: 'row' }, copy, h('span', { class: 'grow' }), h('button', { type: 'button', 'data-close': '1', text: T('Cancel', '取消') }), target ? use : null));
    patIn.addEventListener('input', upd); text.addEventListener('input', upd);
    dialog(T('Pattern builder', '樣式建構器'), box, { focus: '#wb-pat' });
    upd();
  }
  doc.addEventListener('click', (e) => { const b = e.target.closest('[data-regex]'); if (b) openWorkbench(b.dataset.regex); });

  // ---------- Searchable list boxes: every <select> on the site is upgraded to one ----------
  // The native <select> stays in the DOM (so the page works without scripts and form values do not change); it is
  // hidden from sight and from the tab order. Choosing sets select.value (or option.selected) and fires bubbling
  // "input" and "change" events, so every existing listener keeps working. Programmatic select.value writes are
  // caught by a setter patched onto each upgraded select, option changes by a MutationObserver per select, and a
  // "site:sync" event on the select or the document forces a re-read.
  const CBV = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
  const cb = { seq: 0, openFor: null, mql: window.matchMedia ? window.matchMedia('(max-width: 719.98px)') : { matches: false } };
  const cbText = (el) => { if (!el) return ''; const c = el.cloneNode(true); for (const x of c.querySelectorAll('.l2')) x.remove(); return c.textContent.trim(); };
  const CB_BADGE = { newest: ['newest', '最新'], oldest: ['oldest', '最舊'] };
  function cbOptions(sel) {
    const out = [];
    const add = (o, grp) => out.push({ o, value: o.value, text: o.textContent.trim(), l1: o.dataset.l1 || o.textContent.trim(), sub: o.dataset.sub || '', kw: o.dataset.kw || '', group: o.dataset.group || grp || '', badge: o.dataset.badge || '', disabled: o.disabled });
    for (const n of sel.children) {
      if (n.tagName === 'OPTION') add(n, '');
      else if (n.tagName === 'OPTGROUP') for (const o of n.children) if (o.tagName === 'OPTION') add(o, n.label);
    }
    return out;
  }
  function upgradeSelect(sel) {
    if (sel._cb || sel.hasAttribute('data-cb-skip') || !sel.parentNode) return;
    const n = ++cb.seq;
    const multi = sel.multiple || sel.hasAttribute('data-cb-multi');
    const lab = sel.closest('label');
    let labSpan = lab ? lab.querySelector(':scope > span') : null;
    if (labSpan && !labSpan.id) labSpan.id = `cb-l-${n}`;
    const visible = !!labSpan && !labSpan.classList.contains('sr-only');
    const labText = () => (labSpan ? cbText(labSpan) : '') || sel.getAttribute('aria-label') || '';
    const wrap = h('span', { class: 'cb' });
    const cbLab = h('span', { class: 'cb-lab', id: `cb-lb-${n}` });
    const val = h('span', { class: 'cb-val', id: `cb-v-${n}` });
    const field = h('button', { type: 'button', class: 'cb-field', role: 'combobox', 'aria-haspopup': 'listbox', 'aria-expanded': 'false', 'aria-controls': `cb-list-${n}`, 'aria-labelledby': `${labSpan ? labSpan.id : cbLab.id} ${val.id}` },
      h('span', { class: 'cb-text' }, visible ? null : cbLab, val));
    field.appendChild(doc.createRange().createContextualFragment('<svg class="cb-chev" aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>'));
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(field); wrap.appendChild(sel);
    sel.classList.add('cb-native'); sel.tabIndex = -1; sel.setAttribute('aria-hidden', 'true'); sel.setAttribute('data-cb-native', '');
    const st = { sel, field, multi, n, wrap, query: '' };
    sel._cb = st;
    function summary() {
      const opts = cbOptions(sel);
      if (multi) {
        const on = opts.filter((x) => x.o.selected);
        if (!on.length) return T(sel.dataset.cbAll || 'All', sel.dataset.cbAllYue || '全部');
        if (on.length === 1) return on[0].text;
        return T(`${on.length} chosen`, `已揀 ${on.length} 個`);
      }
      const cur = opts.find((x) => x.o.selected) || opts.find((x) => x.value === sel.value);
      return cur ? cur.text : '';
    }
    function refresh() {
      cbLab.textContent = labText();
      val.textContent = summary() || ' ';
      field.disabled = sel.disabled;
      if (sel.hasAttribute('inert')) field.setAttribute('inert', ''); else field.removeAttribute('inert');
      if (sel.getAttribute('aria-disabled') === 'true') field.setAttribute('aria-disabled', 'true'); else field.removeAttribute('aria-disabled');
    }
    st.refresh = refresh;
    if (!multi) Object.defineProperty(sel, 'value', { configurable: true, get() { return CBV.get.call(this); }, set(v) { CBV.set.call(this, v); refresh(); } });
    sel.addEventListener('change', refresh); sel.addEventListener('site:sync', refresh);
    new MutationObserver(refresh).observe(sel, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['disabled', 'inert', 'aria-disabled', 'label', 'data-cb-all'] });
    field.addEventListener('click', () => { if (cb.openFor === st) closeCb(); else openCb(st, ''); });
    field.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openCb(st, ''); } else if (e.key.length === 1 && e.key !== ' ') { e.preventDefault(); openCb(st, e.key); }
    });
    refresh();
  }
  function upgradeAll(root) {
    if (!root || root.nodeType !== 1) return;
    if (root.tagName === 'SELECT') upgradeSelect(root);
    for (const s of root.querySelectorAll ? root.querySelectorAll('select') : []) upgradeSelect(s);
  }
  function closeCb(noFocus) {
    const st = cb.openFor; if (!st) return;
    cb.openFor = null;
    if (st.cleanup) st.cleanup();
    if (st.panel) st.panel.remove(); if (st.back) st.back.remove();
    st.panel = null; st.back = null;
    st.field.setAttribute('aria-expanded', 'false');
    if (!noFocus && doc.body.contains(st.field)) st.field.focus();
  }
  function openCb(st, seed) {
    if (cb.openFor && cb.openFor !== st) closeCb(true);
    if (cb.openFor === st || st.field.disabled) return;
    cb.openFor = st;
    const { sel, multi, n } = st;
    const sheet = cb.mql.matches;
    const title = (st.field.querySelector('.cb-lab') ? st.field.querySelector('.cb-lab').textContent : '') || (cbText(sel.closest('label') && sel.closest('label').querySelector(':scope > span'))) || sel.getAttribute('aria-label') || T('Choose', '揀');
    const input = h('input', { type: 'search', class: 'cb-q', id: `cb-q-${n}`, role: 'combobox', 'aria-autocomplete': 'list', 'aria-expanded': 'true', 'aria-controls': `cb-list-${n}`, 'aria-haspopup': 'listbox', autocomplete: 'off', spellcheck: 'false', placeholder: T('Search or /pattern/', '搜尋或 /樣式/'), 'aria-label': `${T('Search in', '喺呢度搜尋')} ${title}` });
    input.value = seed || '';
    const rx = h('button', { type: 'button', class: 'pill-icon regex-btn', 'data-regex': `cb-q-${n}`, 'aria-label': T('Pattern builder for this search', '呢個搜尋嘅樣式建構器') });
    rx.appendChild(doc.createRange().createContextualFragment('<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 17.5v.01M12 5v9M8 7.5l8 4M16 7.5l-8 4"/></svg>'));
    const find = h('div', { class: 'find cb-find', role: 'search' }, input, sel.closest('#ov') ? null : rx);
    const count = h('p', { class: 'small muted cb-count', 'aria-live': 'polite' });
    const list = h('div', { class: 'cb-list', id: `cb-list-${n}`, role: 'listbox', 'aria-label': title, tabindex: '-1' });
    if (multi) list.setAttribute('aria-multiselectable', 'true');
    const empty = h('div', { class: 'cb-empty', hidden: '' }, h('span', { text: T('Nothing matches.', '冇配對。') }), ' ');
    const clearQ = h('button', { type: 'button', class: 'text', text: T('Clear', '清除') }); empty.appendChild(clearQ);
    const closeB = h('button', { type: 'button', class: 'text cb-close', text: T('Close', '閂') });
    const head = h('div', { class: 'cb-head' }, h('h2', { class: 'cb-title', id: `cb-t-${n}`, text: title }), closeB);
    const tools = multi ? h('div', { class: 'row cb-tools' }) : null;
    let allB = null; let noneB = null; let chosen = null;
    if (multi) {
      allB = h('button', { type: 'button', class: 'tonal', text: T('Select all shown', '揀晒顯示嘅') });
      noneB = h('button', { type: 'button', class: 'text', text: T('Clear', '清除') });
      chosen = h('span', { class: 'small', 'aria-live': 'polite' });
      tools.append(allB, noneB, chosen);
    }
    const panel = h('div', { class: `cb-panel${sheet ? ' cb-sheet' : ''}`, role: 'dialog', 'aria-label': title });
    if (sheet) panel.setAttribute('aria-modal', 'true');
    if (sheet) panel.appendChild(h('div', { class: 'cb-grab', 'aria-hidden': 'true' }));
    panel.append(head, find, count, ...(tools ? [tools] : []), list, empty);
    const back = sheet ? h('div', { class: 'cb-back' }) : null;
    if (back) body.appendChild(back);
    body.appendChild(panel);
    st.panel = panel; st.back = back;
    st.field.setAttribute('aria-expanded', 'true');
    let items = []; let active = -1; let away = false;
    const all = cbOptions(sel);
    const grouped = all.length > 12 && all.some((x) => x.group);
    function pick(x) {
      if (x.disabled) return;
      if (multi) {
        x.o.selected = !x.o.selected;
        sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true }));
        paint(true);
      } else {
        const changed = CBV.get.call(sel) !== x.value;
        closeCb();
        if (changed) { sel.value = x.value; sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); }
      }
    }
    function setActive(i, scroll) {
      const els = list.querySelectorAll('[role="option"]');
      for (const e of els) e.removeAttribute('data-active');
      active = Math.max(0, Math.min(items.length - 1, i));
      const cur = els[active];
      if (cur) { cur.setAttribute('data-active', ''); input.setAttribute('aria-activedescendant', cur.id); if (scroll !== false) cur.scrollIntoView({ block: 'nearest' }); } else input.removeAttribute('aria-activedescendant');
    }
    function paint(keep) {
      const mt = compile(input.value.trim());
      searchError(input, mt);
      const prevVal = keep && items[active] ? items[active].value : null;
      items = all.filter((x) => mt.none || (mt.ok && mt.test(`${x.text} ${x.l1} ${x.sub} ${x.kw}`)));
      list.textContent = '';
      let grpEl = null; let lastG = null; let gi = 0;
      items.forEach((x, i) => {
        if (grouped && x.group !== lastG) {
          lastG = x.group; gi += 1;
          const gid = `cb-g-${n}-${gi}`;
          grpEl = h('div', { class: 'cb-group', role: 'group', 'aria-labelledby': gid }, h('div', { class: 'cb-grp', id: gid, text: x.group }));
          list.appendChild(grpEl);
        }
        const on = x.o.selected;
        const l1 = h('span', { class: 'cb-l1' }); l1.appendChild(marked(x.l1, mt));
        const txt = h('span', { class: 'cb-ot' }, l1);
        if (x.sub) { const s = h('span', { class: 'cb-sub small muted' }); s.appendChild(marked(x.sub, mt)); txt.appendChild(s); }
        const opt = h('div', { class: 'cb-opt', role: 'option', id: `cb-o-${n}-${i}`, 'aria-selected': String(!!on), 'aria-disabled': x.disabled ? 'true' : null, 'data-i': String(i) },
          h('span', { class: `cb-tick${multi ? ' cb-box' : ''}`, 'aria-hidden': 'true', text: on ? '✓' : '' }), txt,
          x.badge ? h('span', { class: 'badge cb-badge', text: T(CB_BADGE[x.badge] ? CB_BADGE[x.badge][0] : x.badge, CB_BADGE[x.badge] ? CB_BADGE[x.badge][1] : x.badge) }) : null);
        (grpEl || list).appendChild(opt);
      });
      empty.hidden = items.length > 0; list.hidden = items.length === 0;
      count.textContent = T(`${items.length} of ${all.length}`, `${items.length}/${all.length}`);
      if (multi) { chosen.textContent = T(`${all.filter((x) => x.o.selected).length} chosen`, `已揀 ${all.filter((x) => x.o.selected).length} 個`); allB.disabled = !items.length; }
      let start = prevVal != null ? items.findIndex((x) => x.value === prevVal) : -1;
      if (start < 0 && !input.value.trim()) start = items.findIndex((x) => x.o.selected);
      setActive(start < 0 ? 0 : start, !keep);
      if (!keep && !input.value.trim()) { const c = list.querySelector('[data-active]'); if (c) c.scrollIntoView({ block: 'center' }); }
    }
    function place() {
      if (sheet) return;
      const r = st.field.getBoundingClientRect(); const vw = doc.documentElement.clientWidth; const vh = window.innerHeight;
      const w = Math.min(Math.max(r.width, 300), vw - 16);
      const left = Math.max(8, Math.min(r.left, vw - w - 8));
      const below = vh - r.bottom - 8; const above = r.top - 8;
      const down = below >= 240 || below >= above;
      const maxH = Math.max(160, Math.min(360, down ? below : above));
      panel.style.width = `${w}px`; panel.style.left = `${left}px`; panel.style.maxHeight = `${maxH}px`;
      if (down) { panel.style.top = `${r.bottom + 4}px`; panel.style.bottom = 'auto'; } else { panel.style.bottom = `${vh - r.top + 4}px`; panel.style.top = 'auto'; }
    }
    place();
    paint(false);
    input.focus(); if (seed) input.setSelectionRange(seed.length, seed.length);
    input.addEventListener('input', () => paint(false));
    clearQ.addEventListener('click', () => { input.value = ''; paint(false); input.focus(); });
    closeB.addEventListener('click', () => closeCb());
    if (multi) {
      allB.addEventListener('click', () => { for (const x of items) if (!x.disabled) x.o.selected = true; sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); paint(true); input.focus(); });
      noneB.addEventListener('click', () => { for (const x of all) x.o.selected = false; sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); paint(true); input.focus(); });
    }
    list.addEventListener('mousedown', (e) => e.preventDefault());
    list.addEventListener('click', (e) => { const o = e.target.closest('[role="option"]'); if (o) { const x = items[+o.dataset.i]; if (x) pick(x); } });
    rx.addEventListener('click', () => {
      away = true; panel.classList.add('cb-away'); if (back) back.classList.add('cb-away');
      let seen = false;
      const mo = new MutationObserver(() => { const ov = $('#ov'); if (ov) seen = true; else if (seen) { mo.disconnect(); away = false; panel.classList.remove('cb-away'); if (back) back.classList.remove('cb-away'); input.focus(); } });
      mo.observe(body, { childList: true });
      setTimeout(() => { if (!seen && !$('#ov')) { mo.disconnect(); away = false; panel.classList.remove('cb-away'); if (back) back.classList.remove('cb-away'); } }, 1500);
    });
    panel.addEventListener('keydown', (e) => {
      const k = e.key;
      if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); closeCb(); return; }
      if (k === 'Tab') {
        if (!sheet) { closeCb(true); st.field.focus(); return; }
        const f = $$('button,input', panel).filter((x) => !x.disabled && x.offsetParent !== null);
        if (!f.length) return;
        const first = f[0]; const last = f[f.length - 1];
        if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
        return;
      }
      if (e.target !== input) return;
      const step = { ArrowDown: 1, ArrowUp: -1, PageDown: 8, PageUp: -8 }[k];
      if (step) { e.preventDefault(); if (items.length) setActive(active + step); } else if (k === 'Home' || k === 'End') { e.preventDefault(); if (items.length) setActive(k === 'Home' ? 0 : items.length - 1); } else if (k === 'Enter') { e.preventDefault(); const x = items[active]; if (x) pick(x); }
    });
    const onDown = (e) => { if (away || panel.contains(e.target) || st.wrap.contains(e.target)) return; closeCb(true); };
    const onMove = () => place();
    doc.addEventListener('pointerdown', onDown, true);
    window.addEventListener('resize', onMove); window.addEventListener('scroll', onMove, true);
    st.cleanup = () => { doc.removeEventListener('pointerdown', onDown, true); window.removeEventListener('resize', onMove); window.removeEventListener('scroll', onMove, true); };
    applyVocab(panel);
  }
  doc.addEventListener('site:sync', () => { for (const s of $$('select.cb-native')) if (s._cb) s._cb.refresh(); });
  window.addEventListener('hamu-lang', () => { for (const s of $$('select.cb-native')) if (s._cb) s._cb.refresh(); });
  upgradeAll(doc.body);
  new MutationObserver((recs) => { for (const r of recs) for (const nd of r.addedNodes) if (nd.nodeType === 1) upgradeAll(nd); }).observe(doc.body, { childList: true, subtree: true });

  // ---------- Personal wording (local only) ----------
  const VL = { bytes: 262144, depth: 8, key: 160, value: 1000 };
  function parseVocab(text) {
    if (text.length > VL.bytes) return { ok: false, error: 'The file is larger than 256 KiB.' };
    let depth = 0; let max = 0; let inStr = false;
    for (let i = 0; i < text.length; i++) { const c = text[i]; if (inStr) { if (c === '\\') i++; else if (c === '"') inStr = false; continue; } if (c === '"') inStr = true; else if (c === '{' || c === '[') { depth++; max = Math.max(max, depth); } else if (c === '}' || c === ']') depth--; }
    if (max > VL.depth) return { ok: false, error: 'The file is nested too deeply.' };
    let obj; try { obj = JSON.parse(text); } catch (e) { return { ok: false, error: 'The file is not valid JSON.' }; }
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { ok: false, error: 'The file must hold one object.' };
    if (Object.keys(obj).some((f) => f !== 'schemaVersion' && f !== 'entries')) return { ok: false, error: 'The file has a field other than schemaVersion and entries.' };
    if (obj.schemaVersion !== 1) return { ok: false, error: 'Only schema version 1 is understood.' };
    const e = obj.entries; if (!e || typeof e !== 'object' || Array.isArray(e)) return { ok: false, error: 'entries must be an object.' };
    const keys = text.match(/"((?:[^"\\]|\\.)*)"\s*:/g) || []; const seen = {}; let dup = false;
    keys.forEach((k) => { if (seen[k]) dup = true; seen[k] = 1; });
    if (dup) return { ok: false, error: 'A key appears twice.' };
    const out = {}; let n = 0; let bad = null;
    Object.keys(e).forEach((k) => {
      const v = e[k]; if (bad) return;
      if (k === '__proto__' || k === 'prototype' || k === 'constructor') bad = 'The file has an unsafe key.';
      else if (!k.trim() || k.length > VL.key) bad = 'A key is empty or longer than 160 characters.';
      else if (typeof v !== 'string' || v.length > VL.value) bad = 'A value is not text or is longer than 1000 characters.';
      else if (/[\u0000-\u001f\u007f-\u009f]/.test(k + v)) bad = 'The file has a control character.';
      else { out[k] = v; n++; }
    });
    if (bad) return { ok: false, error: bad };
    return { ok: true, entries: out, count: n };
  }
  let replacer = null;
  function buildReplacer() {
    replacer = null;
    const v = SET.vocab; if (!v) return;
    const keys = Object.keys(v).sort((a, b) => b.length - a.length);
    if (!keys.length) return;
    const re = new RegExp(keys.map((k) => k.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')).join('|'), 'g');
    const LD = /[\p{L}\p{N}]/u;
    replacer = (t) => t.replace(re, (m, off) => {
      const b = off > 0 ? t[off - 1] : ''; const a = t[off + m.length] || '';
      if ((b && (LD.test(b) || /[_/\\@.]/.test(b))) || (a && (LD.test(a) || /[_/\\@]/.test(a)))) return m;
      return v[m] || m;
    });
  }
  function applyVocab(root) {
    if (!replacer || !root) return;
    const tw = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => { const p = n.parentNode; if (!p || /^(SCRIPT|STYLE|TEXTAREA|PRE|CODE|INPUT|OPTION)$/.test(p.nodeName) || p.closest('.mono,[data-novocab],#ov')) return NodeFilter.FILTER_REJECT; return NodeFilter.FILTER_ACCEPT; } });
    const list = []; let n; while ((n = tw.nextNode())) list.push(n);
    for (const t of list) { const r = replacer(t.nodeValue); if (r !== t.nodeValue) t.nodeValue = r; }
  }

  // ---------- Exports ----------
  const FORMAT_LABEL = { json: 'JSON', csv: 'CSV', md: 'Markdown', txt: 'plain text', html: 'HTML', print: 'print' };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function toFormat(fmt, title, cols, rows) {
    if (fmt === 'json') return { type: 'application/json', ext: 'json', text: JSON.stringify(rows.map((r) => Object.fromEntries(cols.map((c, i) => [c, r[i]]))), null, 2) };
    if (fmt === 'csv') { const q = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`; return { type: 'text/csv', ext: 'csv', text: [cols.map(q).join(','), ...rows.map((r) => r.map(q).join(','))].join('\r\n') + '\r\n' }; }
    if (fmt === 'md') { const c = (v) => String(v == null ? '' : v).replace(/\|/g, '\\|').replace(/\n+/g, ' '); return { type: 'text/markdown', ext: 'md', text: `# ${title}\n\n| ${cols.join(' | ')} |\n| ${cols.map(() => '---').join(' | ')} |\n${rows.map((r) => `| ${r.map(c).join(' | ')} |`).join('\n')}\n` }; }
    if (fmt === 'txt') return { type: 'text/plain', ext: 'txt', text: `${title}\n\n${rows.map((r) => cols.map((c, i) => `${c}: ${r[i]}`).join('\n')).join('\n\n')}\n` };
    const tbl = `<table><thead><tr>${cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((v) => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    return { type: 'text/html', ext: 'html', text: `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:system-ui,sans-serif;margin:24px}table{border-collapse:collapse}th,td{border:1px solid #888;padding:6px 10px;text-align:start;vertical-align:top}</style></head><body><h1>${esc(title)}</h1>${tbl}</body></html>` };
  }
  function download(name, type, text) {
    const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
    const a = h('a', { href: url, download: name }); body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  function printHtml(htmlText) {
    const f = h('iframe', { title: 'Print', class: 'print-frame', 'aria-hidden': 'true' });
    body.appendChild(f);
    f.contentDocument.open(); f.contentDocument.write(htmlText); f.contentDocument.close();
    setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { toast(T('Printing is not available here.', '呢度用唔到列印。')); } setTimeout(() => f.remove(), 1500); }, 250);
  }
  const exporters = {}; // scope -> (selectedOnly) => { title, cols, rows } | Promise
  function runExport(scope, fmt, selectedOnly) {
    const f = exporters[scope]; if (!f) { toast(T('Nothing to export here.', '呢度冇嘢可以匯出。')); return; }
    Promise.resolve(f(selectedOnly)).then((d) => {
      if (!d || !d.rows.length) { toast(T('Nothing to export: the list is empty.', '冇嘢可以匯出：清單係空嘅。')); return; }
      const out = toFormat(fmt === 'print' ? 'html' : fmt, d.title, d.cols, d.rows);
      if (fmt === 'print') { printHtml(out.text); toast(T(`Sent ${plural(d.rows.length, 'row', 'rows')} to print.`, `已送 ${d.rows.length} 行去列印。`)); return; }
      download(`${scope}.${out.ext}`, out.type, out.text);
      toast(T(`Exported ${plural(d.rows.length, 'row', 'rows')} as ${FORMAT_LABEL[fmt]}.`, `已匯出 ${d.rows.length} 行，格式：${FORMAT_LABEL[fmt]}。`));
    });
  }
  doc.addEventListener('click', (e) => {
    const b = e.target.closest('[data-export]');
    if (b) { runExport(b.dataset.scope, b.dataset.export, !!b.dataset.selected); const d = b.closest('details'); if (d) d.open = false; }
  });

  // ---------- Bulk actions (select several; export, compare, open) ----------
  const bulk = {};
  function setupBulk(scope, opts) {
    const bar = $(`#bulk-${scope}`); if (!bar) return;
    const n = $(`#bulk-n-${scope}`); const all = $(`[data-selall="${scope}"]`);
    const sels = () => $$(`input.sel[data-sel="${scope}"]`);
    const picked = () => sels().filter((c) => c.checked).map((c) => c.value);
    const visible = () => sels().filter((c) => { const row = c.closest('li,details'); return row && !row.hidden && row.offsetParent !== null; });
    function paint() {
      const p = picked(); n.textContent = T(`${p.length} selected`, `揀咗 ${p.length} 項`);
      for (const b of $$('[data-bulk]', bar)) b.disabled = b.dataset.bulk === 'compare' ? p.length < 2 : !p.length;
      const ex = $('[data-bulk-export]', bar); if (ex) ex.setAttribute('aria-disabled', String(!p.length));
      for (const b of $$('[data-selected]', bar)) b.disabled = !p.length;
      const v = visible(); all.checked = v.length > 0 && v.every((c) => c.checked); all.indeterminate = !all.checked && v.some((c) => c.checked);
    }
    bulk[scope] = { picked, paint };
    doc.addEventListener('change', (e) => { const c = e.target; if (c.matches && c.matches(`input.sel[data-sel="${scope}"]`)) paint(); });
    all.addEventListener('change', () => { for (const c of visible()) c.checked = all.checked; paint(); });
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('[data-bulk]'); if (!b || b.disabled) return;
      const p = picked();
      if (b.dataset.bulk === 'clear') { for (const c of sels()) c.checked = false; paint(); return; }
      if (b.dataset.bulk === 'compare') { const nums = p.map(Number).sort((a, c) => a - c); location.href = `${ROOT}compare/index.html?from=${nums[0]}&to=${nums[nums.length - 1]}`; return; }
      if (b.dataset.bulk === 'tabs') {
        let opened = 0;
        for (const v of p) { const url = scope === 'versions' ? `${ROOT}releases/${v}/` : `#c-${v}`; const w = window.open(scope === 'versions' ? url : location.pathname + url, '_blank', 'noopener'); if (w !== null) opened++; }
        toast(opened === p.length ? T(`Opened ${plural(opened, 'browser tab', 'browser tabs')}.`, `已打開 ${opened} 個瀏覽器分頁。`) : T(`The browser allowed ${opened} of ${p.length} tabs. Allow pop-ups for this site to open the rest.`, `瀏覽器只准開 ${opened}/${p.length} 個分頁。請容許呢個網站彈出視窗。`));
      }
    });
    paint();
    return Object.assign(bulk[scope], opts || {});
  }

  // ---------- Home page ----------
  let searchData = null;
  const searchIndex = new Map();
  function loadSearchData() {
    if (searchData) return Promise.resolve(searchData);
    return getJson(`${ROOT}data/search.json`).then((d) => {
      searchData = d;
      for (const v of d.versions) {
        const vt = [`build ${v.b}`, v.core, v.source, v.h, v.s, v.sy].concat(v.hl.map((x) => `${x.t} ${x.w} ${x.wy} ${x.y}`)).join(' \n ');
        const ch = v.ch.map((c) => ({ c, text: `${c.t} ${c.d} ${c.dy} ${c.s} ${c.a.join(' ')}` }));
        searchIndex.set(v.b, { v, vt, ch, all: vt + ' \n ' + ch.map((x) => x.text).join(' \n ') });
      }
      return d;
    });
  }

  function setupHome() {
    const list = $('#version-list');
    const cards = $$('#version-list > li').map((el) => ({
      el, build: +el.dataset.build, day: el.dataset.day, areas: el.dataset.areas.split(' ').filter(Boolean), feat: el.dataset.feat, n: +el.dataset.changes,
      title: $('.vt', el), sums: $$('.vsum p', el), match: $('.vmatch', el),
    }));
    for (const m of cards) { m.titleText = m.title.textContent; m.sumTexts = m.sums.map((p) => p.textContent); }
    const builds = cards.map((m) => m.build).sort((a, b) => a - b);
    const minB = builds[0]; const maxB = builds[builds.length - 1];
    const newestCard = cards.find((m) => m.build === maxB);
    const days = {};
    for (const m of cards) { const d = days[m.day] || (days[m.day] = { v: 0, c: 0 }); d.v += 1; d.c += m.n; }
    const monthsWith = Object.keys(days).map((d) => d.slice(0, 7)).filter((x, i, a) => a.indexOf(x) === i).sort();
    const state = { q: '', areas: [], feat: 'all', from: minB, to: maxB, sort: 'new', day: '', month: newestCard ? newestCard.day.slice(0, 7) : '' };
    let calFocus = newestCard ? newestCard.day : '';
    let hold = false;

    const input = $('#home-search'); const countLive = $('#search-count');
    const featSel = $('#f-feat'); const fromSel = $('#f-from'); const toSel = $('#f-to'); const sortSel = $('#f-sort');
    const chips = $$('.filters .chip[data-area]');
    const status = $('#vs-status'); const hiddenNote = $('#hidden-note'); const hiddenText = $('#hidden-text');

    function readHash() {
      const raw = location.hash.slice(1);
      const p = new URLSearchParams(raw.indexOf('=') >= 0 ? raw : '');
      const q = new URLSearchParams(location.search);
      state.q = p.get('q') || q.get('q') || '';
      state.areas = (p.get('areas') || '').split(',').filter((a) => AREAS[a]);
      state.feat = ['y', 'n'].indexOf(p.get('kind')) >= 0 ? p.get('kind') : 'all';
      const f = +p.get('from'); const t = +p.get('to');
      state.from = builds.indexOf(f) >= 0 ? f : minB; state.to = builds.indexOf(t) >= 0 ? t : maxB;
      state.sort = p.get('sort') === 'old' ? 'old' : 'new';
      state.day = /^\d{4}-\d{2}-\d{2}$/.test(p.get('day') || '') ? p.get('day') : '';
      if (state.day) { state.month = state.day.slice(0, 7); calFocus = state.day; }
    }
    function writeHash() {
      const p = new URLSearchParams();
      if (state.q) p.set('q', state.q);
      if (state.areas.length) p.set('areas', state.areas.join(','));
      if (state.feat !== 'all') p.set('kind', state.feat);
      if (state.from !== minB) p.set('from', state.from);
      if (state.to !== maxB) p.set('to', state.to);
      if (state.sort !== 'new') p.set('sort', state.sort);
      if (state.day) p.set('day', state.day);
      const s = p.toString();
      try { history.replaceState(null, '', location.pathname + (s ? `#${s}` : '')); } catch (e) { /* ignore */ }
    }
    function syncControls() {
      input.value = state.q; featSel.value = state.feat; fromSel.value = String(state.from); toSel.value = String(state.to); sortSel.value = state.sort;
      for (const c of chips) c.setAttribute('aria-pressed', String(state.areas.indexOf(c.dataset.area) >= 0));
    }

    function versionMatch(build, mt) {
      const e = searchIndex.get(build);
      if (!e) return { ok: true };
      let ok;
      if (mt.regex) ok = mt.test(e.vt) || e.ch.some((x) => mt.test(x.text)); else ok = mt.test(e.all);
      if (!ok) return { ok: false };
      return { ok: true, changes: e.ch.filter((x) => mt.test(x.text)).map((x) => x.c) };
    }
    function paintMatch(m, res, mt) {
      m.title.textContent = ''; m.title.appendChild(marked(m.titleText, mt));
      m.sums.forEach((p, i) => { p.textContent = ''; p.appendChild(marked(m.sumTexts[i], mt)); });
      const box = m.match; box.textContent = '';
      if (mt.none || !res || !res.changes || !res.changes.length) { box.hidden = true; return; }
      box.hidden = false;
      const ul = h('ul');
      res.changes.slice(0, 5).forEach((c) => { const a = h('a', { href: `releases/${m.build}/#c-${c.s}` }); a.appendChild(marked(c.t, mt)); ul.appendChild(h('li', null, a)); });
      if (res.changes.length > 5) ul.appendChild(h('li', null, h('a', { href: `releases/${m.build}/#all`, text: T(`and ${res.changes.length - 5} more matching changes`, `仲有 ${res.changes.length - 5} 項夾到嘅更改`) })));
      box.appendChild(h('div', { class: 'mt', text: T(`Matching changes in this version (${res.changes.length})`, `呢個版本夾到嘅更改（${res.changes.length}）`) }));
      box.appendChild(ul);
    }
    function activeSummary() {
      const bits = [];
      if (state.areas.length) bits.push(state.areas.map((a) => T(AREAS[a], AREAS_YUE[a])).join(', '));
      if (state.feat !== 'all') bits.push(state.feat === 'y' ? T('with new features', '有新功能') : T('housekeeping only', '只係雜務'));
      if (state.from !== minB || state.to !== maxB) bits.push(T(`builds ${state.from} to ${state.to}`, `第 ${state.from} 至 ${state.to} 版`));
      if (state.sort === 'old') bits.push(T('oldest first', '舊嘅先'));
      return bits.length ? T('Active: ', '使用緊：') + bits.join('; ') : T('No filters active', '冇使用篩選');
    }

    function apply(skipHash) {
      if (hold) return;
      const mt = compile(state.q);
      searchError(input, mt);
      let shown = 0; let changeHits = 0;
      for (const m of cards) {
        let ok = m.build >= state.from && m.build <= state.to;
        if (ok && state.feat !== 'all') ok = m.feat === state.feat;
        if (ok && state.areas.length) ok = state.areas.some((a) => m.areas.indexOf(a) >= 0);
        if (ok && state.day) ok = m.day === state.day;
        let res = null;
        if (ok && !mt.none) { res = mt.ok ? versionMatch(m.build, mt) : { ok: false }; ok = res.ok; }
        m.el.hidden = !ok;
        paintMatch(m, ok ? res : null, ok ? mt : { none: true });
        if (ok) { shown += 1; if (res && res.changes) changeHits += res.changes.length; }
      }
      const arr = state.sort === 'old' ? cards.slice().reverse() : cards;
      arr.forEach((m) => list.appendChild(m.el));
      const bits = [];
      if (state.day) bits.push(T(fmtDay(state.day), fmtDayYue(state.day)));
      if (state.q) bits.push(T(`matching "${state.q}"`, `夾到「${state.q}」`));
      status.textContent = T(`Showing ${shown} of ${cards.length} versions`, `顯示 ${shown}/${cards.length} 個版本`) + (bits.length ? ': ' + bits.join(', ') : '');
      countLive.textContent = !mt.none && mt.ok ? (searchData ? T(`${plural(shown, 'version', 'versions')}, ${plural(changeHits, 'change', 'changes')}`, `${shown} 個版本，${changeHits} 項更改`) : T('Searching', '搜尋緊')) : '';
      $('#f-active').textContent = activeSummary();
      if (shown < cards.length) {
        hiddenNote.hidden = false;
        hiddenText.textContent = shown === 0 ? T('No version matches the filters and the search.', '冇版本夾到篩選同搜尋。') : T(`${plural(cards.length - shown, 'other version is', 'other versions are')} hidden by the filters, the day and the search.`, `有 ${cards.length - shown} 個其他版本被篩選、日子同搜尋隱藏咗。`);
      } else hiddenNote.hidden = true;
      renderCalendar();
      if (bulk.versions) bulk.versions.paint();
      applyVocab(list);
      if (!skipHash) writeHash();
    }

    // --- calendar ---
    const calBody = $('#cal-body'); const calMonth = $('#cal-month'); const calPrev = $('#cal-prev'); const calNext = $('#cal-next');
    const heat = (n) => (n >= 100 ? 3 : n >= 20 ? 2 : 1);
    const dayLabel = (d, mo, y) => T(`${d} ${MONTHS[mo - 1]} ${y}`, `${y}年${mo}月${d}日`);
    const focusDay = (day) => { const e = $(`[data-day="${day}"]`, calBody); if (e) e.focus(); };
    function renderCalendar() {
      const ym = state.month;
      const first = monthsWith[0]; const last = monthsWith[monthsWith.length - 1];
      const opts = monthsWith.slice();
      if (ym && opts.indexOf(ym) < 0) { opts.push(ym); opts.sort(); }
      calMonth.textContent = '';
      for (const o of opts) calMonth.appendChild(h('option', { value: o, text: lang === 'yue' ? monthLabelYue(o) : monthLabel(o) }));
      calMonth.value = ym;
      calPrev.disabled = !first || ym <= first; calNext.disabled = !last || ym >= last;
      const [y, mo] = ym.split('-').map(Number);
      const lead = (new Date(Date.UTC(y, mo - 1, 1)).getUTCDay() + 6) % 7;
      const dim = new Date(Date.UTC(y, mo, 0)).getUTCDate();
      calBody.textContent = '';
      const tot = { v: 0, c: 0, d: 0 };
      let target = calFocus && calFocus.slice(0, 7) === ym ? calFocus : '';
      if (!target) { for (let d = dim; d >= 1; d--) { if (days[`${ym}-${pad(d)}`]) { target = `${ym}-${pad(d)}`; break; } } }
      if (!target) target = `${ym}-01`;
      let tr = null;
      for (let i = 0; i < lead + dim; i++) {
        if (i % 7 === 0) { tr = h('tr', { role: 'row' }); calBody.appendChild(tr); }
        if (i < lead) { tr.appendChild(h('td', { class: 'empty', role: 'presentation' })); continue; }
        const d = i - lead + 1; const day = `${ym}-${pad(d)}`; const info = days[day]; const tabindex = day === target ? '0' : '-1';
        if (info) {
          tot.v += info.v; tot.c += info.c; tot.d += 1;
          const pressed = state.day === day;
          const label = `${dayLabel(d, mo, y)}: ${T(`${plural(info.v, 'version', 'versions')}, ${plural(info.c, 'change', 'changes')}`, `${info.v} 個版本，${info.c} 項更改`)}${pressed ? T('. Chosen', '。已揀') : ''}`;
          const btn = h('button', { type: 'button', class: `cal-day heat${heat(info.c)}`, 'data-day': day, 'aria-pressed': String(pressed), 'aria-label': label, tabindex },
            h('b', { text: String(d) }),
            h('span', { class: 'long', text: T(plural(info.v, 'version', 'versions'), `${info.v} 個版本`) }),
            h('span', { class: 'long', text: T(plural(info.c, 'change', 'changes'), `${info.c} 項更改`) }),
            h('span', { class: 'short', text: `${info.v} / ${info.c}` }));
          tr.appendChild(h('td', { role: 'gridcell' }, btn));
        } else tr.appendChild(h('td', { class: 'plain', role: 'gridcell', 'data-day': day, tabindex, 'aria-label': `${dayLabel(d, mo, y)}: ${T('no versions', '冇版本')}`, text: String(d) }));
      }
      while (tr && tr.children.length < 7) tr.appendChild(h('td', { class: 'empty', role: 'presentation' }));
      $('#cal-caption').textContent = T(`Versions and changes per day in ${monthLabel(ym)}`, `${monthLabelYue(ym)}每日嘅版本同更改`);
      $('#cal-summary').textContent = tot.v
        ? T(`${monthLabel(ym)}: ${plural(tot.v, 'version', 'versions')} and ${plural(tot.c, 'change', 'changes')} on ${plural(tot.d, 'day', 'days')}. Choose a day to show only its versions.`, `${monthLabelYue(ym)}：${tot.d} 日共有 ${tot.v} 個版本、${tot.c} 項更改。揀一日就只睇嗰日嘅版本。`)
        : T(`${monthLabel(ym)}: no versions were released this month.`, `${monthLabelYue(ym)}：呢個月冇發佈版本。`);
      const yb = $('#year-body'); yb.textContent = '';
      for (const m of monthsWith) {
        let v = 0; let c = 0;
        for (const d of Object.keys(days)) if (d.slice(0, 7) === m) { v += days[d].v; c += days[d].c; }
        yb.appendChild(h('tr', null, h('th', { scope: 'row', text: lang === 'yue' ? monthLabelYue(m) : monthLabel(m) }), h('td', { text: String(v) }), h('td', { text: String(c) }),
          h('td', null, h('button', { type: 'button', class: 'text', 'data-month': m, 'aria-label': T(`Show ${monthLabel(m)} in the calendar`, `喺日曆顯示${monthLabelYue(m)}`), text: T('Show', '顯示') }))));
      }
    }
    calMonth.addEventListener('change', () => { state.month = calMonth.value; calFocus = ''; renderCalendar(); });
    calPrev.addEventListener('click', () => { state.month = addMonths(state.month, -1); calFocus = ''; renderCalendar(); });
    calNext.addEventListener('click', () => { state.month = addMonths(state.month, 1); calFocus = ''; renderCalendar(); });
    $('#cal-newest').addEventListener('click', () => { if (!newestCard) return; state.month = newestCard.day.slice(0, 7); calFocus = newestCard.day; renderCalendar(); focusDay(calFocus); });
    $('#year-body').addEventListener('click', (e) => { const b = e.target.closest('[data-month]'); if (b) { state.month = b.dataset.month; calFocus = ''; renderCalendar(); } });
    calBody.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-day]'); if (!b) return;
      state.day = state.day === b.dataset.day ? '' : b.dataset.day; calFocus = b.dataset.day; apply(); focusDay(calFocus);
    });
    calBody.addEventListener('focusin', (e) => { const c = e.target.closest('[data-day]'); if (c) calFocus = c.dataset.day; });
    calBody.addEventListener('keydown', (e) => {
      const c = e.target.closest('[data-day]'); if (!c) return;
      const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key]; if (!step) return;
      e.preventDefault();
      const next = addDays(c.dataset.day, step); const nm = next.slice(0, 7);
      if (nm !== state.month) { if (nm < monthsWith[0] || nm > monthsWith[monthsWith.length - 1]) return; state.month = nm; }
      calFocus = next; renderCalendar(); focusDay(next);
    });

    // --- chart: changes per day, smooth line, scrub by pointer and keyboard ---
    function drawChart() {
      const box = $('#chart-box'); const readout = $('#chart-read');
      const ds = Object.keys(days).sort(); if (!ds.length) return;
      const W = 800; const H = 220; const P = { l: 40, r: 16, t: 16, b: 32 };
      const max = Math.max.apply(null, ds.map((d) => days[d].c)) || 1;
      const x = (i) => P.l + (ds.length === 1 ? (W - P.l - P.r) / 2 : (i * (W - P.l - P.r)) / (ds.length - 1));
      const y = (v) => H - P.b - (v / max) * (H - P.t - P.b);
      const pts = ds.map((d, i) => [x(i), y(days[d].c)]);
      let d = `M${pts[0][0]},${pts[0][1]}`;
      for (let i = 0; i < pts.length - 1; i++) { const p0 = pts[i - 1] || pts[i]; const p1 = pts[i]; const p2 = pts[i + 1]; const p3 = pts[i + 2] || p2; d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`; }
      const NS = 'http://www.w3.org/2000/svg';
      const svg = doc.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('class', 'chart-svg'); svg.setAttribute('aria-hidden', 'true');
      const mk = (tag, a) => { const e = doc.createElementNS(NS, tag); for (const k of Object.keys(a)) e.setAttribute(k, a[k]); return e; };
      svg.appendChild(mk('line', { x1: P.l, y1: H - P.b, x2: W - P.r, y2: H - P.b, class: 'ax' }));
      svg.appendChild(mk('path', { d: `${d} L${pts[pts.length - 1][0]},${H - P.b} L${pts[0][0]},${H - P.b} Z`, class: 'area' }));
      svg.appendChild(mk('path', { d, class: 'line', pathLength: '1' }));
      ds.forEach((dd, i) => { const t = mk('text', { x: x(i), y: H - 10, class: 'tick', 'text-anchor': 'middle' }); t.textContent = dd.slice(8); svg.appendChild(t); });
      const t0 = mk('text', { x: 4, y: P.t + 8, class: 'tick' }); t0.textContent = String(max); svg.appendChild(t0);
      const dot = mk('circle', { r: 7, class: 'dot', cx: pts[0][0], cy: pts[0][1] }); const rule = mk('line', { class: 'rule', y1: P.t, y2: H - P.b, x1: pts[0][0], x2: pts[0][0] });
      svg.appendChild(rule); svg.appendChild(dot);
      box.textContent = ''; box.appendChild(svg);
      let idx = ds.length - 1;
      const sel = (i) => {
        idx = Math.max(0, Math.min(ds.length - 1, i)); const k = ds[idx];
        dot.setAttribute('cx', pts[idx][0]); dot.setAttribute('cy', pts[idx][1]); rule.setAttribute('x1', pts[idx][0]); rule.setAttribute('x2', pts[idx][0]);
        readout.textContent = T(`${fmtDay(k)}: ${plural(days[k].v, 'version', 'versions')}, ${plural(days[k].c, 'change', 'changes')}`, `${fmtDayYue(k)}：${days[k].v} 個版本，${days[k].c} 項更改`);
      };
      box.onpointermove = (e) => { const r = svg.getBoundingClientRect(); const px = ((e.clientX - r.left) / r.width) * W; let best = 0; pts.forEach((p, i) => { if (Math.abs(p[0] - px) < Math.abs(pts[best][0] - px)) best = i; }); sel(best); };
      box.onkeydown = (e) => { const s = { ArrowLeft: -1, ArrowRight: 1, Home: -999, End: 999 }[e.key]; if (s) { e.preventDefault(); sel(s === -999 ? 0 : s === 999 ? ds.length - 1 : idx + s); } };
      sel(idx);
      box.setAttribute('aria-label', T(`Chart of changes per day, ${ds.length} days, busiest day ${max} changes`, `每日更改圖表，共 ${ds.length} 日，最多一日有 ${max} 項更改`));
    }

    // --- filter controls ---
    for (const c of chips) c.addEventListener('click', () => {
      const a = c.dataset.area; const i = state.areas.indexOf(a);
      if (i >= 0) state.areas.splice(i, 1); else state.areas.push(a);
      c.setAttribute('aria-pressed', String(i < 0)); apply();
    });
    featSel.addEventListener('change', () => { state.feat = featSel.value; apply(); });
    fromSel.addEventListener('change', () => { state.from = +fromSel.value; if (state.from > state.to) { state.to = state.from; toSel.value = String(state.to); } apply(); });
    toSel.addEventListener('change', () => { state.to = +toSel.value; if (state.to < state.from) { state.from = state.to; fromSel.value = String(state.from); } apply(); });
    sortSel.addEventListener('change', () => { state.sort = sortSel.value; apply(); });
    function clearAll() { state.q = ''; state.areas = []; state.feat = 'all'; state.from = minB; state.to = maxB; state.sort = 'new'; state.day = ''; syncControls(); apply(); }
    $('#f-clear').addEventListener('click', clearAll); $('#hidden-clear').addEventListener('click', clearAll);
    input.addEventListener('input', () => { state.q = input.value.trim(); apply(); });
    $('#home-form').addEventListener('submit', (e) => e.preventDefault());
    window.addEventListener('hashchange', () => { if (location.hash.indexOf('=') >= 0) { readHash(); syncControls(); apply(true); } });
    window.addEventListener('hamu-lang', () => { drawChart(); apply(true); paintToggle(); });
    // collapsible filters, remembered for the visit
    const tgl = $('#f-toggle'); const fbody = $('#f-body');
    function paintToggle() { const open = !fbody.hidden; tgl.setAttribute('aria-expanded', String(open)); tgl.textContent = open ? T('Hide filters', '收埋篩選') : T('Show filters', '顯示篩選'); }
    tgl.addEventListener('click', () => { fbody.hidden = !fbody.hidden; store.set('sessionStorage', 'hamu-filters', fbody.hidden ? 'closed' : 'open'); paintToggle(); });
    if (store.get('sessionStorage', 'hamu-filters') === 'closed') fbody.hidden = true;

    // exports and bulk for the versions list
    exporters.versions = (selectedOnly) => loadSearchData().then(() => {
      const pick = selectedOnly ? bulk.versions.picked().map(Number) : cards.filter((m) => !m.el.hidden).map((m) => m.build);
      const rows = searchData.versions.filter((v) => pick.indexOf(v.b) >= 0).map((v) => [v.b, v.core, v.date, v.h || '', v.ch.length, v.hl.length, [...new Set(v.ch.flatMap((c) => c.a))].join(' ')]);
      return { title: 'Home Assistant Material versions', cols: ['build', 'core', 'date', 'headline', 'changes', 'features', 'areas'], rows };
    });
    setupBulk('versions');

    readHash();
    if (location.search) { try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) { /* ignore */ } }
    syncControls(); paintToggle(); drawChart(); apply(true);
    if (state.q) writeHash();
    loadSearchData().then(() => apply(true)).catch(() => { countLive.textContent = state.q ? T('Search data could not be loaded', '載入唔到搜尋資料') : ''; });
  }

  // ---------- Release page ----------
  function setupRelease() {
    const tabs = $$('[role="tab"]'); const panels = $$('[role="tabpanel"]');
    function selectTab(id, focus) {
      for (const t of tabs) { const on = t.dataset.tab === id; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; if (on && focus) t.focus(); }
      for (const p of panels) p.hidden = p.id !== `panel-${id}`;
    }
    if (tabs.length) {
      panels.forEach((p, i) => { p.hidden = i !== 0; });
      tabs.forEach((t, i) => {
        t.addEventListener('click', () => selectTab(t.dataset.tab, false));
        t.addEventListener('keydown', (e) => {
          const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
          if (e.key === 'Home') { e.preventDefault(); selectTab(tabs[0].dataset.tab, true); } else if (e.key === 'End') { e.preventDefault(); selectTab(tabs[tabs.length - 1].dataset.tab, true); } else if (k) { e.preventDefault(); selectTab(tabs[(i + k + tabs.length) % tabs.length].dataset.tab, true); }
        });
      });
      for (const b of $$('[data-demo-tab]')) b.addEventListener('click', () => selectTab(b.dataset.demoTab, false));
      for (const p of panels) {
        const start = $('[data-start]', p); if (!start) continue;
        start.addEventListener('click', () => {
          const frame = $('.demo-frame', p);
          const f = h('iframe', { title: frame.dataset.title, loading: 'lazy', sandbox: 'allow-scripts', src: frame.dataset.src });
          frame.textContent = ''; frame.classList.add('loaded'); frame.appendChild(f); start.hidden = true;
        });
      }
    }
    const changes = $$('details.change'); const groups = $$('.chg-group'); const bars = $$('.chg-bars .abar');
    const q = $('#chg-q'); const count = $('#chg-count'); const none = $('#chg-none');
    const sortSel = $('#chg-sort'); const explSw = $('#chg-expl'); const clearB = $('#chg-clear');
    changes.forEach((c, i) => { c._i = i; });
    const fl = { areas: [], expl: false, sort: 'new' };
    function readUrl() {
      const p = new URLSearchParams(location.search);
      fl.areas = (p.get('areas') || '').split(',').filter((a) => bars.some((b) => b.dataset.area === a));
      fl.expl = p.get('expl') === '1'; fl.sort = p.get('sort') === 'old' ? 'old' : 'new';
      if (q && p.get('q')) q.value = p.get('q');
    }
    function writeUrl() {
      const p = new URLSearchParams();
      if (q && q.value.trim()) p.set('q', q.value.trim());
      if (fl.areas.length) p.set('areas', fl.areas.join(','));
      if (fl.expl) p.set('expl', '1');
      if (fl.sort === 'old') p.set('sort', 'old');
      const s = p.toString();
      try { history.replaceState(null, '', location.pathname + (s ? `?${s}` : '') + location.hash); } catch (e) { /* ignore */ }
    }
    const anyFilter = () => !!((q && q.value.trim()) || fl.areas.length || fl.expl || fl.sort !== 'new');
    function filter() {
      const mt = compile(q ? q.value : '');
      if (q) searchError(q, mt);
      let shown = 0;
      for (const c of changes) {
        if (c._t === undefined) c._t = c.textContent;
        let ok = !fl.areas.length || (c.dataset.areas || '').split(' ').some((a) => fl.areas.indexOf(a) >= 0);
        if (ok && fl.expl) ok = c.dataset.expl === '1';
        if (ok && !mt.none) ok = mt.ok && mt.test(c._t);
        c.hidden = !ok; if (ok) shown += 1;
        const ct = $('.ct', c);
        if (ct) { if (ct._o === undefined) ct._o = ct.textContent; ct.textContent = ''; ct.appendChild(ok && !mt.none ? marked(ct._o, mt) : doc.createTextNode(ct._o)); }
      }
      for (const g of groups) {
        const list = $$('details.change', g);
        list.sort((x, y) => { const d = String(y.dataset.date || '').localeCompare(String(x.dataset.date || '')); return (fl.sort === 'old' ? -d : d) || x._i - y._i; });
        for (const c of list) g.appendChild(c);
        g.hidden = !list.some((c) => !c.hidden);
      }
      for (const b of bars) b.setAttribute('aria-pressed', String(fl.areas.indexOf(b.dataset.area) >= 0));
      count.textContent = T(`Showing ${shown} of ${changes.length} changes`, `顯示 ${shown}/${changes.length} 項更改`);
      none.hidden = shown !== 0;
      if (clearB) clearB.disabled = !anyFilter();
      if (bulk.changes) bulk.changes.paint();
    }
    function resetAll() { if (q) q.value = ''; fl.areas = []; fl.expl = false; fl.sort = 'new'; if (sortSel) sortSel.value = 'new'; if (explSw) explSw.checked = false; filter(); writeUrl(); }
    readUrl(); if (sortSel) sortSel.value = fl.sort; if (explSw) explSw.checked = fl.expl;
    if (q) q.addEventListener('input', () => { filter(); writeUrl(); });
    for (const b of bars) b.addEventListener('click', () => { const i = fl.areas.indexOf(b.dataset.area); if (i >= 0) fl.areas.splice(i, 1); else fl.areas.push(b.dataset.area); filter(); writeUrl(); });
    if (sortSel) sortSel.addEventListener('change', () => { fl.sort = sortSel.value === 'old' ? 'old' : 'new'; filter(); writeUrl(); });
    if (explSw) explSw.addEventListener('change', () => { fl.expl = explSw.checked; filter(); writeUrl(); });
    if (clearB) clearB.addEventListener('click', resetAll);
    const nc = $('#chg-none-clear'); if (nc) nc.addEventListener('click', resetAll);
    function openHash() {
      const id = decodeURIComponent(location.hash.slice(1)); if (id.indexOf('c-') !== 0) return;
      const el = doc.getElementById(id); if (!el) return;
      if (el.hidden) { resetAll(); }
      el.open = true; el.scrollIntoView();
    }
    window.addEventListener('hashchange', openHash); window.addEventListener('hamu-lang', filter);
    filter();
    const build = body.getAttribute('data-build');
    exporters.changes = (selectedOnly) => {
      const pick = selectedOnly ? bulk.changes.picked() : null;
      const rows = changes.filter((c) => (pick ? pick.indexOf(c.id.slice(2)) >= 0 : !c.hidden)).map((c) => [c.id.slice(2), $('.cdate', c).textContent, $('.ct', c)._o || $('.ct', c).textContent, (c.dataset.areas || '').split(' ').join(' '), $$('.cdetail', c)[0] ? $$('.cdetail', c)[0].textContent.trim() : '']);
      return { title: `Home Assistant Material build ${build}: changes`, cols: ['sha', 'date', 'title', 'areas', 'explanation'], rows };
    };
    setupBulk('changes');
    openHash();
  }

  // ---------- Compare page ----------
  function setupCompare() {
    const out = $('#cmp-out');
    getJson(`${ROOT}data/changes.json`).then((data) => {
      const rel = data.releases.filter((r) => r.tag !== undefined).sort((a, b) => a.build - b.build);
      const byB = new Map(rel.map((r) => [r.build, r]));
      const fromSel = $('#cmp-from'); const toSel = $('#cmp-to');
      for (const r of rel) { const day = parts(r.date).day; const label = `Build ${r.build}, ${fmtDay(day)}`; const oa = { value: String(r.build), 'data-l1': `Build ${r.build}`, 'data-sub': `${fmtDay(day)}${r.changes && r.changes[0] ? ', ' + r.changes[0].title : ''}`, 'data-kw': `${r.build} ${r.core || ''} ${fmtDay(day)} ${day}`, 'data-group': monthLabel(day.slice(0, 7)), text: label }; fromSel.appendChild(h('option', oa)); toSel.appendChild(h('option', oa)); }
      const qs = new URLSearchParams(location.search); const newest = rel[rel.length - 1];
      let to = byB.has(+qs.get('to')) ? +qs.get('to') : newest.build;
      let from = byB.has(+qs.get('from')) ? +qs.get('from') : (byB.has(newest.previous_build) ? newest.previous_build : rel[0].build);
      fromSel.value = String(from); toSel.value = String(to);
      let current = [];
      const cf = { q: qs.get('q') || '', areas: (qs.get('areas') || '').split(',').filter((k) => AREAS[k]), builds: (qs.get('builds') || '').split(',').map(Number).filter((x) => byB.has(x)), expl: qs.get('expl') === '1', sort: qs.get('sort') === 'old' ? 'old' : 'new' };
      function writeUrl() {
        const p = new URLSearchParams(); p.set('from', String(from)); p.set('to', String(to));
        if (cf.areas.length) p.set('areas', cf.areas.join(','));
        if (cf.builds.length) p.set('builds', cf.builds.join(','));
        if (cf.q) p.set('q', cf.q);
        if (cf.expl) p.set('expl', '1');
        if (cf.sort === 'old') p.set('sort', 'old');
        try { history.replaceState(null, '', location.pathname + '?' + p.toString()); } catch (e) { /* ignore */ }
      }
      function render() {
        from = +fromSel.value; to = +toSel.value;
        out.textContent = '';
        if (from === to) { current = []; writeUrl(); out.appendChild(h('p', { class: 'note', text: T('Choose two different versions to compare.', '請揀兩個唔同嘅版本嚟比較。') })); return; }
        const lo = Math.min(from, to); const hi = Math.max(from, to); const a = byB.get(lo); const b = byB.get(hi);
        const between = rel.filter((r) => r.build > lo && r.build <= hi).sort((x, y) => y.build - x.build);
        const rows = [[T('Build', '建置'), (r) => String(r.build)], ['Home Assistant Core', (r) => r.core], ['Supervisor', (r) => r.supervisor], [T('Operating system', '作業系統'), (r) => r.os], [T('Date', '日期'), (r) => fmtLong(r.date)], [T('Source', '原始碼'), (r) => r.source], [T('Number of changes', '更改數目'), (r) => String(r.changes.length)]];
        const table = h('table', { class: 'cmp-table' },
          h('thead', null, h('tr', null, h('th', { scope: 'col' }), h('th', { scope: 'col', text: T(`From build ${lo}`, `由第 ${lo} 版`) }), h('th', { scope: 'col', text: T(`To build ${hi}`, `到第 ${hi} 版`) }))),
          h('tbody', null, ...rows.map(([name, fn], i) => h('tr', null, h('th', { scope: 'row', text: name }), h('td', { class: i ? 'mono' : '', text: fn(a) }), h('td', { class: i ? 'mono' : '', text: fn(b) })))));
        out.appendChild(h('div', { class: 'card stack' }, h('h2', { text: T('Side by side', '並排比較') }), h('div', { class: 'scroll-x' }, table)));
        const counts = {}; let total = 0;
        for (const r of between) for (const c of r.changes) { total += 1; for (const ar of c.areas || []) counts[ar] = (counts[ar] || 0) + 1; }
        cf.builds = cf.builds.filter((x) => between.some((r) => r.build === x));
        cf.areas = cf.areas.filter((k) => counts[k]);
        writeUrl();
        out.appendChild(h('div', { class: 'cmp-hero', role: 'group', 'aria-label': T('From, number of changes, to', '由、更改數目、到') }, h('div', { class: 'cmp-b cmp-from' }, h('span', { class: 'small', text: T('From', '由') }), h('b', { text: String(lo) }), h('span', { class: 'small', text: fmtDay(parts(a.date).day) })), h('div', { class: 'cmp-b cmp-n' }, h('b', { text: String(total) }), h('span', { text: T(total === 1 ? 'change' : 'changes', '項更改') })), h('div', { class: 'cmp-b cmp-to' }, h('span', { class: 'small', text: T('To', '到') }), h('b', { text: String(hi) }), h('span', { class: 'small', text: fmtDay(parts(b.date).day) }))));
        const bars = h('div', { class: 'abars', role: 'group', 'aria-label': T('Show only these parts of the product', '只睇呢啲產品部分') },
          ...AREA_ORDER.filter((k) => counts[k]).map((k) => {
            const bt = h('button', { type: 'button', class: 'abar', 'data-area': k, 'aria-pressed': String(cf.areas.indexOf(k) >= 0), style: `--w:${Math.max(4, Math.round((counts[k] / (total || 1)) * 100))}%` },
              h('span', { class: 'abar-t' }, h('span', { class: 'abar-tick', 'aria-hidden': 'true' }), h('span', { text: T(AREAS[k], AREAS_YUE[k]) })), h('b', { text: String(counts[k]) }));
            bt.addEventListener('click', () => { const i = cf.areas.indexOf(k); if (i >= 0) cf.areas.splice(i, 1); else cf.areas.push(k); bt.setAttribute('aria-pressed', String(i < 0)); paintList(); writeUrl(); });
            return bt;
          }));
        out.appendChild(h('div', { class: 'card stack' }, h('h2', { text: T('What changed between them', '兩者之間改咗乜') }),
          h('p', { text: T(`${plural(total, 'change', 'changes')} in ${plural(between.length, 'version', 'versions')}, from the version after build ${lo} up to and including build ${hi}. A change that touches several parts is counted once in each part. Press a part to show only its changes; press it again to undo.`, `喺 ${between.length} 個版本入面共有 ${total} 項更改（由第 ${lo} 版之後，到第 ${hi} 版包括在內）。一項更改涉及幾個部分，每個部分都會計一次。撳一個部分就只睇佢嘅更改，再撳一次就取消。`) }), bars));
        const search = h('input', { type: 'search', id: 'cmp-q', placeholder: T('Search these changes', '搜尋呢啲更改'), autocomplete: 'off', value: cf.q });
        const listBox = h('div', { class: 'stack' }); const count = h('p', { class: 'small muted', id: 'cmp-count', 'aria-live': 'polite' }); const hiddenB = h('p', { class: 'small muted', id: 'cmp-hidden-builds' });
        const bsel = h('select', { id: 'cmp-builds', multiple: '', 'data-cb-multi': '', 'data-cb-all': 'All', 'data-cb-all-yue': '全部' },
          ...between.map((r) => h('option', { value: String(r.build), 'data-l1': `Build ${r.build}`, 'data-sub': `${fmtDay(parts(r.date).day)}${r.changes[0] ? ', ' + r.changes[0].title : ''}`, 'data-kw': `${r.build} ${r.core || ''} ${fmtDay(parts(r.date).day)} ${parts(r.date).day}`, 'data-group': monthLabel(parts(r.date).day.slice(0, 7)), text: `Build ${r.build}` })));
        for (const o of bsel.options) o.selected = cf.builds.indexOf(+o.value) >= 0;
        const ssel = h('select', { id: 'cmp-sort' }, h('option', { value: 'new', text: T('Newest first', '新嘅先') }), h('option', { value: 'old', text: T('Oldest first', '舊嘅先') }));
        ssel.value = cf.sort;
        const expl = h('input', { type: 'checkbox', class: 'switch', role: 'switch', id: 'cmp-expl' }); expl.checked = cf.expl;
        const clearB = h('button', { type: 'button', id: 'cmp-clear', text: T('Clear filters', '清除篩選') });
        function anyFilter() { return !!(cf.q || cf.areas.length || cf.builds.length || cf.expl || cf.sort !== 'new'); }
        function resetAll() { cf.q = ''; cf.areas = []; cf.builds = []; cf.expl = false; cf.sort = 'new'; search.value = ''; expl.checked = false; ssel.value = 'new'; for (const o of bsel.options) o.selected = false; bsel.dispatchEvent(new Event('site:sync')); for (const x of $$('.abar', bars)) x.setAttribute('aria-pressed', 'false'); paintList(); writeUrl(); }
        function paintList() {
          const mt = compile(cf.q); searchError(search, mt);
          listBox.textContent = ''; let shown = 0; current = []; let empty = 0; let scope = 0;
          const order = cf.sort === 'old' ? between.slice().reverse() : between;
          for (const r of order) {
            if (cf.builds.length && cf.builds.indexOf(r.build) < 0) continue;
            scope += 1;
            let items = r.changes.filter((c) => (!cf.areas.length || (c.areas || []).some((x) => cf.areas.indexOf(x) >= 0)) && (!cf.expl || !!(c.detail || c.detail_yue)) && (mt.none || (mt.ok && mt.test(`${c.title} ${c.detail || ''} ${c.detail_yue || ''} ${c.sha}`))));
            if (cf.sort === 'old') items = items.slice().sort((x, y) => String(x.date).localeCompare(String(y.date)));
            if (!items.length) { empty += 1; continue; }
            shown += items.length;
            const box = h('div', { class: 'cmp-ver' }, h('h3', null, h('a', { href: `${ROOT}releases/${r.build}/`, text: `Build ${r.build}` }), ` ${fmtLong(r.date)}`));
            for (const c of items) {
              current.push([r.build, c.sha, c.date, c.title, (c.areas || []).join(' '), c.detail || '']);
              const ttl = h('span', { class: 'ct' }); ttl.appendChild(marked(c.title, mt));
              box.appendChild(h('details', { class: 'change' },
                h('summary', null, ttl, h('span', { class: 'small muted', text: fmtShort(c.date) }), h('span', { class: 'small muted mono', text: c.sha })),
                h('div', { class: 'cbody' },
                  c.detail ? h('div', { class: `txt${c.detail_yue ? ' t-en has-yue' : ''}` }, ...String(c.detail).split(/\n\s*\n/).map((t) => h('p', { text: t }))) : h('p', { class: 'muted', text: T('No further explanation was published for this change.', '呢項更改冇再公佈詳細說明。') }),
                  c.detail_yue ? h('div', { class: 'txt t-yue', lang: 'yue' }, ...String(c.detail_yue).split(/\n\s*\n/).map((t) => h('p', { text: t }))) : null,
                  h('div', { class: 'row' }, ...(c.areas || []).map((x) => h('span', { class: 'badge', text: T(AREAS[x] || x, AREAS_YUE[x] || x) }))))));
            }
            listBox.appendChild(box);
          }
          count.textContent = T(`Showing ${shown} of ${total} changes`, `顯示 ${shown}/${total} 項更改`);
          hiddenB.textContent = empty && anyFilter() ? T(`${plural(empty, 'build has', 'builds have')} no matching change`, `有 ${empty} 個建置冇夾到嘅更改`) : '';
          clearB.disabled = !anyFilter();
          if (!shown) {
            const clr = h('button', { type: 'button', class: 'text', id: 'cmp-empty-clear', text: T('Clear filters', '清除篩選') }); clr.addEventListener('click', resetAll);
            listBox.appendChild(h('div', { class: 'note dashed', id: 'cmp-none' }, h('span', { text: T('No change matches the filters and the search.', '冇更改夾到篩選同搜尋。') }), ' ', clr));
          }
          void scope; applyVocab(listBox);
        }
        search.addEventListener('input', () => { cf.q = search.value.trim(); paintList(); writeUrl(); });
        bsel.addEventListener('change', () => { cf.builds = Array.prototype.filter.call(bsel.options, (o) => o.selected).map((o) => +o.value); paintList(); writeUrl(); });
        ssel.addEventListener('change', () => { cf.sort = ssel.value === 'old' ? 'old' : 'new'; paintList(); writeUrl(); });
        expl.addEventListener('change', () => { cf.expl = expl.checked; paintList(); writeUrl(); });
        clearB.addEventListener('click', resetAll);
        paintList();
        const find = h('div', { class: 'find', role: 'search' }, h('label', { class: 'sr-only', for: 'cmp-q', text: T('Search these changes', '搜尋呢啲更改') }), search,
          h('button', { type: 'button', class: 'pill-icon regex-btn', 'data-regex': 'cmp-q', 'aria-label': T('Pattern builder for this search', '呢個搜尋嘅樣式建構器') }));
        $('.regex-btn', find).appendChild(doc.createRange().createContextualFragment('<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 17.5v.01M12 5v9M8 7.5l8 4M16 7.5l-8 4"/></svg>'));
        const tools = h('div', { class: 'row filter-row chg-tools' },
          h('label', { class: 'field grow' }, h('span', { text: T('Builds', '建置') }), bsel),
          h('label', { class: 'field grow' }, h('span', { text: T('Order', '次序') }), ssel),
          h('label', { class: 'chk' }, expl, h('span', { text: T('With an explanation only', '只顯示有說明嘅') })), clearB);
        out.appendChild(h('section', { class: 'stack', 'aria-label': T('Changes between the versions', '兩個版本之間嘅更改') },
          h('div', { class: 'al-head' }, h('h2', { text: T('Every change', '每一項更改') }), h('div', { class: 'inline-search' }, find)), tools, count, hiddenB, listBox));
      }
      exporters.compare =       exporters.compare = () => ({ title: `Home Assistant Material: changes between build ${Math.min(from, to)} and build ${Math.max(from, to)}`, cols: ['build', 'sha', 'date', 'title', 'areas', 'explanation'], rows: current });
      fromSel.addEventListener('change', render); toSel.addEventListener('change', render);
      window.addEventListener('hamu-lang', render);
      render();
    }).catch((err) => { if (window.console) console.warn('compare:', err && err.message); out.textContent = ''; out.appendChild(h('p', { class: 'note error', text: T('The change list could not be loaded, so the comparison is not available. Reload the page to try again.', '載入唔到更改清單，所以用唔到比較。請重新載入頁面再試。') })); });
  }

  // ---------- Features page ----------
  function setupFeatures() {
    const q = $('#ft-q'); const rows = $$('.ft-row'); const groups = $$('.ft-group'); const chips = $$('[data-state]', doc).filter((c) => c.tagName === 'BUTTON');
    let st = 'all'; const count = $('#ft-count');
    function filter() {
      const mt = compile(q.value); searchError(q, mt); let n = 0;
      for (const r of rows) { const ok = (st === 'all' || r.dataset.state === st) && (mt.none || (mt.ok && mt.test(r.dataset.text))); r.hidden = !ok; if (ok) n++; }
      for (const g of groups) g.hidden = !$$('.ft-row', g).some((r) => !r.hidden);
      count.textContent = T(`${n} of ${rows.length} shown`, `顯示 ${n}/${rows.length} 項`);
    }
    q.addEventListener('input', filter);
    for (const c of chips) c.addEventListener('click', () => { st = c.dataset.state; for (const o of chips) o.setAttribute('aria-pressed', String(o === c)); filter(); });
    window.addEventListener('hamu-lang', filter);
    filter();
  }

  // ---------- Settings page ----------
  function superConfirm(what, items, done) {
    const keys = { a: false, b: false };
    const k1 = h('button', { type: 'button', class: 'key', 'aria-pressed': 'false', text: T('Key 1: I know what is lost', '鑰匙 1：我知道會失去咩') });
    const k2 = h('button', { type: 'button', class: 'key', 'aria-pressed': 'false', text: T('Key 2: I am sure', '鑰匙 2：我肯定') });
    const slide = h('input', { type: 'range', min: '0', max: '100', value: '0', disabled: '', 'aria-label': T('Slide all the way to confirm', '一直滑到底確認'), id: 'sc-slide' });
    const stt = h('p', { class: 'small', 'aria-live': 'polite', id: 'sc-state' });
    const go = h('button', { type: 'button', class: 'danger', disabled: '', text: what });
    const exit = h('button', { type: 'button', text: T('Emergency exit', '緊急退出') });
    const sync = () => {
      k1.setAttribute('aria-pressed', String(keys.a)); k2.setAttribute('aria-pressed', String(keys.b));
      const both = keys.a && keys.b; slide.disabled = !both; if (!both) slide.value = '0';
      go.disabled = !(both && +slide.value === 100);
      stt.textContent = !both ? T(keys.a || keys.b ? 'One key turned. Turn the other one.' : 'Both keys are needed before the slider moves.', keys.a || keys.b ? '已經轉咗一把鑰匙，請轉另一把。' : '兩把鑰匙都要轉，滑桿先郁到。') : +slide.value === 100 ? T('Armed. Press the red button.', '準備好。撳紅色掣。') : T(`Keys turned. Slide all the way: ${slide.value}%.`, `鑰匙轉咗。一直滑到底：${slide.value}%。`);
    };
    k1.addEventListener('click', () => { keys.a = !keys.a; sync(); }); k2.addEventListener('click', () => { keys.b = !keys.b; sync(); });
    slide.addEventListener('input', sync);
    go.addEventListener('click', () => { if (go.disabled) return; closeDialog(); done(); });
    exit.addEventListener('click', closeDialog);
    dialog(what, h('div', { class: 'stack' }, h('ul', null, ...items.map((i) => h('li', { text: i })), h('li', { text: T('This cannot be undone.', '呢個動作冇得還原。') })), h('div', { class: 'row' }, k1, k2), slide, stt, h('div', { class: 'row' }, exit, h('span', { class: 'grow' }), go)), { focus: '.key' });
    sync();
  }
  function setupSettings() {
    exporters.settings = () => ({ title: 'Home Assistant Material site settings', cols: ['setting', 'value'], rows: [['language', lang], ['theme', SET.theme], ['textScale', SET.ts], ['moreContrast', SET.contrast], ['largerTargets', SET.targets], ['reduceMotion', SET.motion], ['wordingEntries', SET.vocab ? Object.keys(SET.vocab).length : 0]] });
    doc.addEventListener('click', (e) => {
      const s = e.target.closest('[data-set]');
      if (s) {
        const k = s.dataset.set; const v = s.dataset.val;
        if (k === 'lang') setLang(v); else { SET[k] = k === 'ts' ? Number(v) : v; saveSet(); applySet(); toast(T('Saved.', '已儲存。')); }
      }
      const r = e.target.closest('[data-reset]');
      if (r) { const k = r.dataset.reset; if (k === 'lang') setLang('en'); else { const map = { theme: 'theme', ts: 'ts', contrast: 'contrast', targets: 'targets', motion: 'motion' }; if (map[k]) { SET[map[k]] = SET_DEF[map[k]]; saveSet(); applySet(); } } toast(T('Back to its default.', '已還原預設值。')); }
      const i = e.target.closest('[data-info]');
      if (i) { const m = $(`#i-${i.dataset.info}`); m.hidden = !m.hidden; i.setAttribute('aria-expanded', String(!m.hidden)); }
    });
    doc.addEventListener('change', (e) => { const s = e.target.closest && e.target.closest('[data-switch]'); if (s) { SET[s.dataset.switch] = s.checked; saveSet(); applySet(); toast(T('Saved.', '已儲存。')); } });
    // search with pattern builder
    const q = $('#set-q'); const rows = $$('.setting'); const none = $('#set-none'); const count = $('#set-count');
    function filter() {
      const mt = compile(q.value); searchError(q, mt); let n = 0;
      for (const r of rows) { const ok = mt.none || (mt.ok && mt.test(r.dataset.search)); r.hidden = !ok; if (ok) n++; }
      for (const g of $$('.setting-group')) g.hidden = !$$('.setting', g).some((r) => !r.hidden);
      none.hidden = n !== 0; count.textContent = mt.none ? '' : T(`${n} of ${rows.length} settings shown`, `顯示 ${n}/${rows.length} 項設定`);
    }
    q.addEventListener('input', filter);
    // wording file
    const state = $('#vocab-state');
    const paintVocab = () => { state.textContent = SET.vocab ? T(`${Object.keys(SET.vocab).length} entries in use.`, `用緊 ${Object.keys(SET.vocab).length} 個詞條。`) : T('No file loaded.', '未載入檔案。'); };
    $('#vocab-file').addEventListener('change', (e) => {
      const f = e.target.files[0]; if (!f) return;
      if (f.size > VL.bytes) { state.textContent = T('The file is larger than 256 KiB.', '檔案超過 256 KiB。'); toast(state.textContent); e.target.value = ''; return; }
      f.text().then((t) => {
        const r = parseVocab(t);
        if (!r.ok) { state.textContent = r.error; toast(T('The wording file was not used: ', '冇用呢個用字檔案：') + r.error); return; }
        SET.vocab = r.entries; saveSet(); buildReplacer(); applyVocab(body); paintVocab(); toast(T('Your wording file is in use.', '用緊你嘅用字檔案。'));
      });
      e.target.value = '';
    });
    $('#vocab-clear').addEventListener('click', () => { SET.vocab = null; saveSet(); buildReplacer(); paintVocab(); toast(T('Wording cleared. Reload the page to see the original words everywhere.', '已清除用字。重新載入頁面就會見到原本嘅字。')); });
    $('#notes-open').addEventListener('click', openNotes);
    $('#notes-clear').addEventListener('click', () => { notes = []; store.set('localStorage', NOTE_KEY, '[]'); paintBell(); toast(T('Notifications cleared.', '已清除通知。'), { silent: true }); });
    $('#reset-all').addEventListener('click', () => superConfirm(T('Reset everything', '全部還原'), [T('Every choice on this site goes back to its default.', '呢個網站所有選擇都返到預設值。'), T('Your wording file is removed.', '你嘅用字檔案會被移除。'), T('Every notification is removed.', '所有通知會被移除。')], () => {
      SET = Object.assign({}, SET_DEF); saveSet(); window.dispatchEvent(new CustomEvent('hamu-reset')); store.set('localStorage', NOTE_KEY, '[]'); notes = []; buildReplacer(); applySet(); setLang('en', true); paintBell(); paintVocab();
      toast(T('Everything is back to its default.', '全部已經還原預設值。'), { silent: true });
    }));
    window.addEventListener('hamu-lang', () => { paintVocab(); filter(); paintBell(); });
    paintVocab(); paintBell(); filter();
    if (location.hash) { const t = $(location.hash); if (t) t.scrollIntoView(); }
  }

  // ---------- Notification centre ----------
  function openNotes() {
    notes.forEach((n) => { n.read = true; }); store.set('localStorage', NOTE_KEY, JSON.stringify(notes)); paintBell();
    const body_ = notes.length ? h('ul', { class: 'plain-list notes' }, ...notes.map((n) => { const d = new Date(n.t); return h('li', null, h('span', { text: n.text }), ' ', h('span', { class: 'small muted', text: `${pad(d.getHours())}:${pad(d.getMinutes())}` })); })) : h('p', { class: 'muted', text: T('No notifications. Messages from this site appear here.', '冇通知。網站嘅訊息會喺度出現。') });
    const clear = h('button', { type: 'button', text: T('Clear', '清除') });
    clear.addEventListener('click', () => { notes = []; store.set('localStorage', NOTE_KEY, '[]'); paintBell(); openNotes(); });
    dialog(T('Notifications', '通知'), h('div', { class: 'stack' }, body_, h('div', { class: 'row' }, clear, h('span', { class: 'grow' }), h('button', { type: 'button', 'data-close': '1', text: T('Close', '閂') }))));
  }

  // ---------- Command palette ----------
  let paletteItems = null;
  function loadPalette() {
    if (paletteItems) return Promise.resolve(paletteItems);
    return getJson(`${ROOT}data/pages.json`).then((d) => { paletteItems = d.items; return paletteItems; });
  }
  function openPalette() {
    const input = h('input', { id: 'pal-q', type: 'search', placeholder: T('Search pages, versions, settings and actions', '搜尋頁面、版本、設定同動作'), autocomplete: 'off', 'aria-label': T('Search pages, versions, settings and actions', '搜尋頁面、版本、設定同動作') });
    const regexBtn = h('button', { type: 'button', class: 'pill-icon regex-btn', 'data-regex': 'pal-q', 'aria-label': T('Pattern builder for this search', '呢個搜尋嘅樣式建構器') }, doc.createRange().createContextualFragment('<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 17.5v.01M12 5v9M8 7.5l8 4M16 7.5l-8 4"/></svg>'));
    const listEl = h('ul', { class: 'cmd-list', role: 'listbox', id: 'pal-list', 'aria-label': T('Results', '結果') });
    const msg = h('p', { class: 'small muted', text: T('Arrow keys move, Enter goes, Escape closes.', '方向鍵移動，Enter 前往，Escape 關閉。') });
    let items = []; let sel = 0; let shown = [];
    function act(it, inTab) {
      closeDialog();
      if (it.href && inTab && window.HAMU && window.HAMU.openTab) { window.HAMU.openTab(ROOT + it.href); return; }
      if (it.href) { location.href = ROOT + it.href; return; }
      if (it.act === 'theme') { SET.theme = THEMES[(THEMES.findIndex((t) => t[0] === SET.theme) + 1) % 3][0]; saveSet(); applySet(); }
      if (it.act === 'lang') setLang(LANGS[(LANGS.findIndex((l) => l[0] === lang) + 1) % 3][0]);
      if (it.act === 'motion') { SET.motion = !SET.motion; saveSet(); applySet(); toast(T('Saved.', '已儲存。')); }
      if (it.act === 'contrast') { SET.contrast = !SET.contrast; saveSet(); applySet(); toast(T('Saved.', '已儲存。')); }
      if (it.act === 'notes') openNotes();
      if (it.act === 'workbench') openWorkbench(null);
    }
    function draw() {
      const mt = compile(input.value); searchError(input, mt);
      shown = items.filter((i) => mt.none || (mt.ok && mt.test(`${i.kind} ${i.label} ${i.yue || ''} ${i.sub || ''}`))).slice(0, 60);
      sel = Math.min(sel, Math.max(0, shown.length - 1));
      listEl.textContent = '';
      shown.forEach((i, n) => {
        const li = h('li', { role: 'option', id: `pal-${n}`, 'aria-selected': String(n === sel), class: n === sel ? 'sel' : '' }, h('b', { text: lang === 'yue' && i.yue ? i.yue : i.label }), ' ', h('span', { class: 'small muted', text: T(i.kind, { Page: '頁面', Version: '版本', Feature: '功能', Setting: '設定', Action: '動作' }[i.kind] || i.kind) }));
        li.addEventListener('click', () => act(i)); if (i.href && window.HAMU && window.HAMU.openTab) { const tb = h('button', { type: 'button', class: 'text tab-open', 'aria-label': T('Open in a tab', '用分頁打開'), text: T('Tab', '分頁') }); tb.addEventListener('click', (ev) => { ev.stopPropagation(); act(i, true); }); li.appendChild(tb); } listEl.appendChild(li);
      });
      if (!shown.length) listEl.appendChild(h('li', { class: 'muted', text: T('Nothing matches.', '冇嘢夾到。') }));
      input.setAttribute('aria-activedescendant', shown.length ? `pal-${sel}` : '');
    }
    input.addEventListener('input', () => { sel = 0; draw(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(shown.length - 1, sel + 1); draw(); } else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); draw(); } else if (e.key === 'Enter' && shown[sel]) { e.preventDefault(); act(shown[sel], e.ctrlKey || e.metaKey); }
    });
    dialog(T('Search everything', '搜尋全部'), h('div', { class: 'stack' }, h('div', { class: 'find' }, input, regexBtn), listEl, msg), { focus: '#pal-q' });
    loadPalette().then((p) => { items = p.concat([
      { kind: 'Action', label: 'Switch light and dark', yue: '轉換淺色同深色', act: 'theme' }, { kind: 'Action', label: 'Change language', yue: '轉換語言', act: 'lang' },
      { kind: 'Action', label: 'Reduce motion on or off', yue: '開關減少動態', act: 'motion' }, { kind: 'Action', label: 'More contrast on or off', yue: '開關加強對比', act: 'contrast' },
      { kind: 'Action', label: 'Open notifications', yue: '打開通知', act: 'notes' }, { kind: 'Action', label: 'Open the pattern builder', yue: '打開樣式建構器', act: 'workbench' }]); draw(); })
      .catch(() => { items = [{ kind: 'Action', label: 'Open the pattern builder', yue: '打開樣式建構器', act: 'workbench' }]; draw(); });
    draw();
  }
  doc.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'F' || e.key === 'f')) { e.preventDefault(); openPalette(); } });

  // ---------- Update coming soon strip ----------
  function setupStrip() {
    const strip = $('#update-strip'); if (!strip) return;
    const newest = +strip.dataset.newest || 0;
    const API = 'https://api.github.com/repos/Ding-Ding-Projects/home-assistant-material/actions/';
    const STAGES = [
      [/^Work out versions/i, 'Preparing', '準備緊'], [/^(Build the frontend|Collect integration translations|Stage the Deploy Assistant)/i, 'Building the interface', '建置介面'],
      [/^Build (aarch64|amd64) (core|supervisor) image/i, 'Building Core and Supervisor', '建置 Core 同 Supervisor'], [/^(Publish the container image|Build the full hosting mode image)/i, 'Publishing container images', '發佈容器映像'],
      [/^Move the update feed/i, 'Offering the Core update', '提供 Core 更新'], [/^Build the .*operating system image/i, 'Building operating system images', '建置作業系統映像'], [/^Publish the release/i, 'Publishing the release', '發佈版本'],
    ];
    const stageOf = (name) => { for (let i = 0; i < STAGES.length; i++) if (STAGES[i][0].test(name)) return i + 1; return 0; };
    const heading = $('#soon-h'); const pct = $('#strip-pct'); const ring = $('#strip-ring'); const fg = $('#ring-fg'); const stat = $('#strip-status'); const rail = $('#strip-rail');
    const jobsBtn = $('#strip-jobs-btn'); const jobsList = $('#strip-jobs'); const checked = $('#strip-checked'); const refresh = $('#strip-refresh');
    let timer = 0; let busy = false; let active = false; let last = null;
    function view(o) {
      last = o; strip.hidden = false;
      strip.classList.toggle('quiet', o.kind === 'quiet'); strip.classList.toggle('bad', o.kind === 'bad');
      heading.textContent = o.build ? T(`Update coming soon: build ${o.build}`, `更新就嚟到：第 ${o.build} 版`) : T('Update coming soon', '更新就嚟到');
      stat.textContent = T(o.en, o.yue);
      if (o.pct == null) { ring.hidden = true; pct.textContent = ''; } else {
        ring.hidden = false; pct.textContent = `${o.pct}%`; fg.setAttribute('stroke-dashoffset', String(100 - o.pct));
        ring.setAttribute('aria-valuenow', String(o.pct)); ring.setAttribute('aria-valuetext', o.valuetext || `${o.pct}%`);
      }
      rail.hidden = !o.stage;
      if (o.stage) $$('li', rail).forEach((li) => { const n = +li.dataset.stage; li.className = n < o.stage ? 'done' : n === o.stage ? 'now' : ''; li.setAttribute('aria-current', n === o.stage ? 'step' : 'false'); const s = STAGES[n - 1]; $('span', li).textContent = `${n}. ${T(s[1], s[2])}`; });
      jobsList.textContent = '';
      if (o.jobs && o.jobs.length) { for (const j of o.jobs) jobsList.appendChild(h('li', null, h('span', { text: j.name }), h('span', { text: T(j.state, j.stateYue) }))); jobsBtn.hidden = false; jobsBtn.textContent = jobsList.hidden ? T('Show every job', '顯示每個工作') : T('Hide the jobs', '收埋工作'); } else { jobsBtn.hidden = true; jobsList.hidden = true; jobsBtn.setAttribute('aria-expanded', 'false'); }
      refresh.textContent = T('Refresh', '重新整理');
    }
    jobsBtn.addEventListener('click', () => { const open = jobsList.hidden; jobsList.hidden = !open; jobsBtn.setAttribute('aria-expanded', String(open)); jobsBtn.textContent = open ? T('Hide the jobs', '收埋工作') : T('Show every job', '顯示每個工作'); });
    const clock = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };
    function api(url) {
      return fetch(url, { headers: { Accept: 'application/vnd.github+json' } }).then((r) => {
        if (r.status === 403 || r.status === 429) { const e = new Error('rate'); e.rate = true; e.reset = r.headers.get('x-ratelimit-reset'); throw e; }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      });
    }
    const JS = { success: ['done', '完成'], skipped: ['skipped', '跳過'], failure: ['failed', '失敗'], cancelled: ['cancelled', '已取消'], timed_out: ['timed out', '逾時'] };
    const jobState = (j) => (j.status === 'completed' ? (JS[j.conclusion] || ['done', '完成']) : j.status === 'in_progress' ? ['running', '行緊'] : ['waiting', '等緊']);
    function check() {
      if (busy) return Promise.resolve();
      busy = true; refresh.disabled = true;
      return api(`${API}workflows/release.yml/runs?per_page=6`).then((d) => {
        const runs = (d.workflow_runs || []).slice().sort((a, b) => b.run_number - a.run_number);
        const act = runs.filter((r) => r.status !== 'completed'); active = act.length > 0;
        if (active) {
          const running = act.filter((r) => r.status === 'in_progress'); const main = running.length ? running[0] : act[0]; const others = act.filter((r) => r !== main);
          if (main.status !== 'in_progress') { view({ build: main.run_number, en: `Build ${main.run_number} is waiting behind another build and has not started yet. ${main.display_title || ''}`.trim(), yue: `第 ${main.run_number} 版喺度等緊另一個建置，仲未開始。${main.display_title || ''}`.trim() }); return; }
          return api(`${API}runs/${main.id}/jobs?per_page=50`).then((jd) => {
            const jobs = jd.jobs || []; const total = jobs.length; const done = jobs.filter((j) => j.status === 'completed').length;
            const rj = jobs.filter((j) => j.status === 'in_progress'); const failed = jobs.filter((j) => j.conclusion === 'failure' || j.conclusion === 'timed_out');
            const pool = rj.length ? rj : jobs.filter((j) => j.status !== 'completed'); const stages = pool.map((j) => stageOf(j.name)).filter(Boolean);
            const stage = stages.length ? Math.min.apply(null, stages) : 0; const p = total ? Math.round((done / total) * 100) : 0;
            let en = stage ? `Stage ${stage} of ${STAGES.length}: ${STAGES[stage - 1][1]}. ` : ''; let yue = stage ? `第 ${stage}/${STAGES.length} 階段：${STAGES[stage - 1][2]}。` : '';
            en += `${done} of ${total} jobs done${rj.length ? `, ${rj.length} running` : ''}. ${main.display_title || ''}`; yue += `${total} 個工作完成咗 ${done} 個${rj.length ? `，${rj.length} 個行緊` : ''}。${main.display_title || ''}`;
            if (stage === 6) { en += ' The operating system images are the slow part and can take one to two hours.'; yue += ' 作業系統映像最慢，可能要一至兩個鐘。'; }
            if (others.length) { en += ` Build ${others.map((o) => o.run_number).join(', ')} ${others.length === 1 ? 'is' : 'are'} waiting behind it.`; yue += ` 第 ${others.map((o) => o.run_number).join('、')} 版喺後面等緊。`; }
            if (failed.length) { en += ` A job has failed (${failed[0].name}), so this build may not finish.`; yue += ` 有個工作失敗咗（${failed[0].name}），呢個建置可能完成唔到。`; }
            view({ build: main.run_number, kind: failed.length ? 'bad' : '', en: en.trim(), yue: yue.trim(), pct: p, stage, valuetext: `${done}/${total}`, jobs: jobs.map((j) => { const s = jobState(j); return { name: j.name, state: s[0], stateYue: s[1] }; }) });
          });
        }
        const lastRun = runs[0];
        if (lastRun && lastRun.run_number > newest) {
          if (lastRun.conclusion === 'success') return view({ build: lastRun.run_number, en: `Build ${lastRun.run_number} has finished and is ready. Its notes appear on this site after the next site update.`, yue: `第 ${lastRun.run_number} 版已經完成，可以用。更新說明會喺網站下次更新後出現。`, pct: 100, valuetext: 'Finished' });
          if (lastRun.conclusion === 'cancelled') return view({ kind: 'quiet', en: `Build ${lastRun.run_number} was replaced by a newer build. This is not an error. Build ${newest} is the newest listed version.`, yue: `第 ${lastRun.run_number} 版俾較新嘅建置取代咗，唔係出錯。最新列出嘅版本係第 ${newest} 版。` });
          return view({ build: lastRun.run_number, kind: 'bad', en: `Build ${lastRun.run_number} failed (${lastRun.conclusion || 'unknown result'}). It will not be offered as an update.`, yue: `第 ${lastRun.run_number} 版失敗（${lastRun.conclusion || '結果不明'}），唔會作為更新提供。` });
        }
        view({ kind: 'quiet', en: `Nothing is on the way right now. Build ${newest} is the newest version.`, yue: `而家冇更新喺途中。最新版本係第 ${newest} 版。` });
      }).catch((e) => {
        active = false;
        if (e && e.rate) {
          const t = e.reset ? new Date(+e.reset * 1000) : null; const hm = t ? `${pad(t.getHours())}:${pad(t.getMinutes())}` : '';
          view({ kind: 'quiet', en: `GitHub allows only a limited number of checks per hour, and that limit is used up. ${t ? `It can be checked again at ${hm} (your time).` : 'Try again later.'}`, yue: `GitHub 每個鐘頭只准檢查有限次數，而家用晒。${t ? `可以喺 ${hm}（你嘅時間）再檢查。` : '請遲啲再試。'}` });
        } else view({ kind: 'quiet', en: 'The build status could not be reached right now. Check your connection and press Refresh.', yue: '而家連唔到建置狀態。請檢查網絡，再撳「重新整理」。' });
      }).then(() => { busy = false; refresh.disabled = false; checked.textContent = T(`Last checked at ${clock()}.`, `最後檢查時間：${clock()}。`); schedule(); });
    }
    function schedule() { clearTimeout(timer); if (active && !doc.hidden) timer = setTimeout(check, 180000); }
    refresh.addEventListener('click', check);
    doc.addEventListener('visibilitychange', () => { if (doc.hidden) clearTimeout(timer); else if (active) check(); });
    window.addEventListener('hamu-lang', () => { if (last) view(last); });
    check();
  }

  // ---------- Start ----------
  buildReplacer();
  applySet();
  doc.addEventListener('click', (e) => {
    if (e.target.closest('#lang-btn')) { setLang(LANGS[(LANGS.findIndex((l) => l[0] === lang) + 1) % 3][0]); }
    if (e.target.closest('#theme-btn')) { SET.theme = THEMES[(THEMES.findIndex((t) => t[0] === SET.theme) + 1) % 3][0]; saveSet(); applySet(); }
    if (e.target.closest('#bell-btn')) openNotes();
    if (e.target.closest('#pal-btn')) openPalette();
  });
  applyLang(doc); paintSwitches(); paintBell(); applyVocab(body); doc.dispatchEvent(new Event('site:sync'));
  function initPage(p) {
    if (p === 'home') setupHome();
    else if (p === 'release') setupRelease();
    else if (p === 'compare') setupCompare();
    else if (p === 'features') setupFeatures();
    else if (p === 'settings') setupSettings();
    setupStrip();
  }
  window.HAMU = { T, toast, dialog, closeDialog, h, $, $$, store, esc, ROOT, PAGE, compile, plural, pad, getLang: () => lang, setLang, SET: () => SET, saveSet, applySet, applyLang, applyVocab, superConfirm, download, printHtml, toFormat, openNotes, openWorkbench, initPage, getJson };
  initPage(PAGE);
  window.dispatchEvent(new CustomEvent('hamu-ready'));
})();
