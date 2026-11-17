/* Site extras, part 2: in-site tabs, the context menu and its shortcuts, the appearance editor, the colour picker,
   the custom logo, toy locks and the animation editor. No dependencies, no cookies, no network. */
(() => {
  'use strict';
  const A = window.HAMU; const HX = window.HX;
  if (!A || !HX) return;
  const { T, toast, dialog, closeDialog, h, $, $$, store } = A;
  const doc = document; const html = doc.documentElement; const body = doc.body;
  const pad = (n) => (n < 10 ? '0' : '') + n;
  const X = () => HX.X();
  const sv = (what, logo) => HX.save(what, logo);
  const debounced = (fn, ms) => { let t = 0; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const rmNow = () => (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || html.classList.contains('calm') || html.classList.contains('aid-calm');

  // ---------- Colour maths ----------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hexToRgb = (hex) => { const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(String(hex || '').trim()); if (!m) return null; let s = m[1]; if (s.length === 3) s = s.split('').map((c) => c + c).join(''); return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)]; };
  const rgbToHex = (r, g, b) => `#${[r, g, b].map((v) => pad(Math.round(clamp(v, 0, 255)).toString(16))).join('')}`;
  function rgbToHsl(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b); const mn = Math.min(r, g, b); const l = (mx + mn) / 2; let hh = 0; let s = 0; if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh *= 60; } return [Math.round(hh) % 360, Math.round(s * 100), Math.round(l * 100)]; }
  function hslToRgb(hh, s, l) { hh = ((hh % 360) + 360) % 360; s /= 100; l /= 100; const k = (n) => (n + hh / 30) % 12; const a = s * Math.min(l, 1 - l); const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)]; }
  const lum = (rgb) => { const c = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const contrast = (a, b) => { const x = lum(a); const y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const cssToHex = (c) => { const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c || ''); return m ? rgbToHex(+m[1], +m[2], +m[3]) : '#000000'; };
  window.HXC = { hexToRgb, rgbToHex, rgbToHsl, hslToRgb, contrast };

  // ---------- Colour picker (a component, also a dialog from Settings) ----------
  function makePicker(opts) {
    let hex = opts.value || '#00639b'; let rainbow = null;
    const wrap = h('div', { class: 'picker stack', id: opts.id || 'picker' });
    const swatch = h('div', { class: 'p-swatch', 'aria-hidden': 'true' });
    const hexIn = h('input', { type: 'text', id: 'pk-hex', class: 'mono', maxlength: '7', 'aria-label': T('Hex colour', '十六進制顏色') });
    const num = (id, label, min, max) => h('input', { type: 'number', id, min: String(min), max: String(max), 'aria-label': label, class: 'num' });
    const rgbIn = [num('pk-r', 'R', 0, 255), num('pk-g', 'G', 0, 255), num('pk-b', 'B', 0, 255)];
    const hslIn = [num('pk-h-n', 'H', 0, 359), num('pk-s-n', 'S', 0, 100), num('pk-l-n', 'L', 0, 100)];
    const range = (id, label, max) => h('input', { type: 'range', id, min: '0', max: String(max), 'aria-label': label });
    const hR = range('pk-h', T('Hue', '色相'), 359); const sR = range('pk-s', T('Saturation', '飽和度'), 100); const lR = range('pk-l', T('Lightness', '亮度'), 100);
    const read = h('p', { class: 'small', id: 'pk-contrast', role: 'status' });
    const recent = h('div', { class: 'row tight', id: 'pk-recent', 'aria-label': T('Recent colours', '最近用過嘅顏色') });
    let silent = false;
    function paint(from) {
      const rgb = hexToRgb(hex) || [0, 0, 0]; const [hh, ss, ll] = rgbToHsl(rgb[0], rgb[1], rgb[2]);
      swatch.style.background = hex;
      if (from !== 'hex') hexIn.value = hex;
      if (from !== 'rgb') rgbIn.forEach((i, k) => { i.value = String(rgb[k]); });
      if (from !== 'hsl') { hR.value = String(hh); sR.value = String(ss); lR.value = String(ll); hslIn[0].value = String(hh); hslIn[1].value = String(ss); hslIn[2].value = String(ll); }
      const pair = opts.pair ? hexToRgb(opts.pair()) : null;
      if (pair) { const c = contrast(rgb, pair); read.textContent = T(`Contrast against the paired colour: ${c.toFixed(2)} to 1. ${c >= 4.5 ? 'Passes AA for normal text.' : c >= 3 ? 'Fails AA for normal text; passes for large text.' : 'Fails AA.'}`, `同配對顏色嘅對比：${c.toFixed(2)} 比 1。${c >= 4.5 ? '一般文字通過 AA。' : c >= 3 ? '一般文字唔通過 AA，大字通過。' : '唔通過 AA。'}`); read.dataset.pass = String(c >= 4.5); } else read.textContent = T('No paired colour to compare with.', '冇配對顏色可以比較。');
    }
    function set(next, from, quiet) { const rgb = hexToRgb(next); if (!rgb) return; hex = rgbToHex(rgb[0], rgb[1], rgb[2]); paint(from); if (!quiet && opts.onChange) opts.onChange(hex); }
    hexIn.addEventListener('input', () => { if (hexToRgb(hexIn.value)) set(hexIn.value, 'hex'); });
    rgbIn.forEach((i) => i.addEventListener('input', () => { set(rgbToHex(+rgbIn[0].value, +rgbIn[1].value, +rgbIn[2].value), 'rgb'); }));
    const fromHsl = (a, b, c) => { const rgb = hslToRgb(+a, +b, +c); set(rgbToHex(rgb[0], rgb[1], rgb[2]), 'hsl'); hslIn[0].value = a; hslIn[1].value = b; hslIn[2].value = c; hR.value = a; sR.value = b; lR.value = c; };
    [hR, sR, lR].forEach((r) => r.addEventListener('input', () => fromHsl(hR.value, sR.value, lR.value)));
    hslIn.forEach((i) => i.addEventListener('input', () => fromHsl(hslIn[0].value || 0, hslIn[1].value || 0, hslIn[2].value || 0)));
    const eye = h('button', { type: 'button', id: 'pk-eye', text: T('Pick from the screen', '從螢幕揀色') });
    if (window.EyeDropper) eye.addEventListener('click', () => { new window.EyeDropper().open().then((r) => set(r.sRGBHex, null)).catch(() => {}); }); else { eye.disabled = true; eye.title = T('This browser has no eyedropper.', '呢個瀏覽器冇滴管。'); }
    const rb = h('input', { type: 'checkbox', class: 'switch', role: 'switch', id: 'pk-rainbow', 'aria-label': T('Rainbow: cycle the hue slowly', '彩虹：色相慢慢循環') });
    const rbNote = h('span', { class: 'small muted', id: 'pk-rb-note' });
    function stopRainbow() { if (rainbow) { clearInterval(rainbow); rainbow = null; } if (opts.onDone) opts.onDone(hex); }
    rb.addEventListener('change', () => {
      if (!rb.checked) { stopRainbow(); rbNote.textContent = ''; return; }
      if (rmNow()) { rbNote.textContent = T('Reduced motion is on, so the rainbow stays still: pick a hue with the slider.', '減少動態開緊，所以彩虹唔會郁。用滑桿揀色相。'); rb.checked = false; return; }
      rbNote.textContent = ''; rainbow = setInterval(() => { if (!wrap.isConnected || rmNow()) { stopRainbow(); rb.checked = false; return; } fromHsl((+hR.value + 3) % 360, +sR.value || 80, +lR.value || 50); }, 90);
    });
    function paintRecent() { recent.textContent = ''; for (const c of (X().recent || []).slice(0, 10)) { const b = h('button', { type: 'button', class: 'recent', 'aria-label': c, style: `background:${c}` }); b.addEventListener('click', () => set(c, null)); recent.appendChild(b); } }
    const useB = h('button', { type: 'button', id: 'pk-use', class: 'tonal', text: T('Keep this colour in the recent list', '放呢個顏色入最近清單') });
    useB.addEventListener('click', () => { const r = (X().recent || []).filter((c) => c !== hex); r.unshift(hex); X().recent = r.slice(0, 10); sv(); paintRecent(); if (opts.onDone) opts.onDone(hex); });
    const copyB = h('button', { type: 'button', text: T('Copy hex', '複製十六進制') }); copyB.addEventListener('click', () => { if (navigator.clipboard) navigator.clipboard.writeText(hex).then(() => toast(T('Copied.', '複製咗。'))).catch(() => toast(T('Copying is not available here.', '呢度用唔到複製。'))); });
    wrap.append(h('div', { class: 'row' }, swatch, h('label', { class: 'field' }, h('span', { text: 'Hex' }), hexIn)),
      h('div', { class: 'row tight', role: 'group', 'aria-label': 'RGB' }, h('span', { class: 'small', text: 'RGB' }), ...rgbIn),
      h('div', { class: 'row tight', role: 'group', 'aria-label': 'HSL' }, h('span', { class: 'small', text: 'HSL' }), ...hslIn),
      h('label', { class: 'slide' }, h('span', { text: T('Hue', '色相') }), hR), h('label', { class: 'slide' }, h('span', { text: T('Saturation', '飽和度') }), sR), h('label', { class: 'slide' }, h('span', { text: T('Lightness', '亮度') }), lR),
      read, h('div', { class: 'row' }, eye, h('label', { class: 'check' }, rb, h('span', { text: T('Rainbow', '彩虹') })), rbNote), h('div', { class: 'row' }, useB, copyB), recent);
    paint(); paintRecent();
    wrap.setValue = (v) => set(v, null, true);
    wrap.getValue = () => hex;
    return wrap;
  }
  function openPickerDialog() { const p = makePicker({ value: '#00639b', pair: () => '#ffffff', id: 'picker-dlg' }); dialog(T('Colour picker', '色彩選擇器'), h('div', { class: 'stack' }, p, h('div', { class: 'row' }, h('span', { class: 'grow' }), h('button', { type: 'button', 'data-close': '1', text: T('Close', '閂') }))), { focus: '#pk-hex' }); }

  // ---------- Appearance editor ----------
  const KINDS = { page: ['Page', '頁面', 'body'], header: ['Header', '標題列', '.site-header'], cards: ['Cards', '卡片', '.card, .vcard, .hl, .fact, .stat'], hero: ['Hero blocks', '大標題區', '.hero, .intro'], buttons: ['Buttons', '掣', 'button:not(.icon):not(.chip):not(.switch):not(.cb-field):not(.abar), .btn'], lists: ['List boxes', '列表框', '.cb-field, .cb-panel'], chips: ['Chips', '標籤掣', '.chip'], badges: ['Badges', '徽章', '.badge'], tables: ['Tables', '表格', 'table, th, td'], calendar: ['Calendar days', '日曆日子', '.cal-day, .cal-table td.plain'], demo: ['Demo frame', '示範框', '.demo-frame'] };
  const PROPS = { bg: 'background-color', color: 'color', border: 'border-color', radius: 'border-radius', pad: 'padding', size: 'font-size', weight: 'font-weight', ls: 'letter-spacing' };
  const UNITS = { radius: 'px', pad: 'px', size: 'px', ls: 'em' };
  const styleEl = h('style', { id: 'hamu-ap' }); doc.head.appendChild(styleEl);
  function apCss() {
    const out = [];
    for (const k of Object.keys(KINDS)) {
      const o = X().ap[k]; if (!o) continue; const decl = [];
      for (const p of Object.keys(PROPS)) { if (o[p] === undefined || o[p] === '') continue; if (p === 'border') decl.push(`border-color:${o[p]}!important;border-style:solid!important;border-width:1px!important`); else if (p === 'bg') decl.push(`background-color:${o[p]}!important;background-image:none!important`); else decl.push(`${PROPS[p]}:${o[p]}${UNITS[p] || ''}!important`); }
      if (decl.length) out.push(`${KINDS[k][2]}{${decl.join(';')}}`);
    }
    return out.join('\n');
  }
  const applyAppearance = () => { styleEl.textContent = apCss(); };
  function sanitizeAp(obj) {
    const out = {}; if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
    for (const k of Object.keys(obj)) {
      if (!KINDS[k] || !obj[k] || typeof obj[k] !== 'object') return null;
      const o = {};
      for (const p of Object.keys(obj[k])) {
        const v = obj[k][p]; if (!PROPS[p]) return null;
        if (p === 'bg' || p === 'color' || p === 'border') { if (typeof v !== 'string' || !/^#[0-9a-f]{6}$/i.test(v)) return null; o[p] = v.toLowerCase(); } else { const n = Number(v); const lim = { radius: [0, 80], pad: [0, 80], size: [8, 64], weight: [100, 900], ls: [-0.2, 1] }[p]; if (!isFinite(n) || n < lim[0] || n > lim[1]) return null; o[p] = n; }
      }
      out[k] = o;
    }
    return out;
  }
  let undo = []; let redo = [];
  const setAp = (next, what) => { undo.push(JSON.stringify(X().ap)); if (undo.length > 100) undo.shift(); redo = []; X().ap = next; applyAppearance(); commitAp(what || 'Appearance'); };
  const commitAp = debounced((w) => sv(w), 600);
  function kindOf(el) { for (const k of Object.keys(KINDS)) { if (k === 'page') continue; try { if (el.closest(KINDS[k][2])) return k; } catch (e) { /* ignore */ } } return 'page'; }
  function openAppearance(kind0) {
    let kind = KINDS[kind0] ? kind0 : 'cards'; let prop = 'bg';
    const sel = h('select', { id: 'ap-kind', 'aria-label': T('Kind of element', '元素類別') }, ...Object.keys(KINDS).map((k) => h('option', { value: k, text: T(KINDS[k][0], KINDS[k][1]) })));
    sel.value = kind;
    const sample = h('div', { class: 'ap-sample' }, h('p', { class: 'small muted', text: T('Live: the page behind this window changes as you edit.', '即時：你一改，後面嘅頁面就會跟住變。') }));
    const propBtns = h('div', { class: 'row', role: 'group', 'aria-label': T('Colour to edit', '要改嘅顏色') });
    const cur = () => (X().ap[kind] = X().ap[kind] || {});
    const computed = (p) => { let el = null; try { el = $(KINDS[kind][2].split(',')[0]); } catch (e) { /* ignore */ } el = el || body; const cs = getComputedStyle(el); return { bg: cssToHex(cs.backgroundColor), color: cssToHex(cs.color), border: cssToHex(cs.borderTopColor), radius: parseFloat(cs.borderTopLeftRadius) || 0, pad: parseFloat(cs.paddingTop) || 0, size: parseFloat(cs.fontSize) || 16, weight: parseInt(cs.fontWeight, 10) || 400, ls: parseFloat(cs.letterSpacing) / (parseFloat(cs.fontSize) || 16) || 0 }[p]; };
    const pair = () => (prop === 'bg' ? (cur().color || computed('color')) : (cur().bg || computed('bg')));
    const picker = makePicker({ value: cur()[prop] || computed(prop), pair, onChange: (hx) => { const n = JSON.parse(JSON.stringify(X().ap)); n[kind] = Object.assign({}, n[kind], { [prop]: hx }); setApLive(n); }, onDone: () => sv('Appearance') });
    function setApLive(n) { if (!setApLive.pushed) { undo.push(JSON.stringify(X().ap)); redo = []; setApLive.pushed = true; setTimeout(() => { setApLive.pushed = false; }, 700); } X().ap = n; applyAppearance(); commitAp('Appearance'); paintUndo(); }
    const sliders = {};
    const mkS = (p, label, min, max, step) => { const s = HX.slider(label, min, max, step, cur()[p] !== undefined ? cur()[p] : computed(p), (v) => { const n = JSON.parse(JSON.stringify(X().ap)); n[kind] = Object.assign({}, n[kind], { [p]: v }); setApLive(n); }, `ap-${p}`); sliders[p] = s; return s; };
    const sRadius = mkS('radius', T('Corner radius (px)', '圓角（px）'), 0, 80, 1); const sPad = mkS('pad', T('Padding (px)', '內距（px）'), 0, 80, 1); const sSize = mkS('size', T('Font size (px)', '字體大細（px）'), 8, 64, 1); const sW = mkS('weight', T('Font weight', '字體粗幼'), 100, 900, 100); const sLs = mkS('ls', T('Letter spacing (em)', '字距（em）'), -0.1, 0.5, 0.01);
    const undoB = h('button', { type: 'button', id: 'ap-undo', text: T('Undo', '還原上一步') }); const redoB = h('button', { type: 'button', id: 'ap-redo', text: T('Redo', '重做') });
    const resetK = h('button', { type: 'button', id: 'ap-reset-kind', text: T('Reset this kind', '還原呢類別') }); const resetA = h('button', { type: 'button', id: 'ap-reset-all', class: 'danger', text: T('Reset all', '全部還原') });
    const exp = h('button', { type: 'button', id: 'ap-export', text: T('Export JSON', '匯出 JSON') }); const impL = h('label', { class: 'btn tonal' }, h('span', { text: T('Import JSON', '匯入 JSON') }), h('input', { type: 'file', id: 'ap-import', accept: 'application/json,.json', hidden: '' }));
    const msg = h('p', { class: 'small', id: 'ap-msg', role: 'status' });
    function paintUndo() { undoB.disabled = !undo.length; redoB.disabled = !redo.length; }
    function refresh() {
      propBtns.textContent = '';
      for (const [p, en, yue] of [['bg', 'Background', '背景'], ['color', 'Text', '文字'], ['border', 'Border', '邊框']]) { const b = h('button', { type: 'button', class: 'chip', 'aria-pressed': String(prop === p), text: T(en, yue) }); b.addEventListener('click', () => { prop = p; refresh(); }); propBtns.appendChild(b); }
      picker.setValue(cur()[prop] || computed(prop));
      for (const p of Object.keys(sliders)) sliders[p].set(cur()[p] !== undefined ? cur()[p] : computed(p));
      paintUndo();
    }
    sel.addEventListener('change', () => { kind = sel.value; refresh(); });
    undoB.addEventListener('click', () => { if (!undo.length) return; redo.push(JSON.stringify(X().ap)); X().ap = JSON.parse(undo.pop()); applyAppearance(); sv('Appearance undo'); refresh(); });
    redoB.addEventListener('click', () => { if (!redo.length) return; undo.push(JSON.stringify(X().ap)); X().ap = JSON.parse(redo.pop()); applyAppearance(); sv('Appearance redo'); refresh(); });
    resetK.addEventListener('click', () => { const n = JSON.parse(JSON.stringify(X().ap)); delete n[kind]; setAp(n, 'Appearance reset: ' + kind); refresh(); });
    resetA.addEventListener('click', () => A.superConfirm(T('Reset all appearance changes', '還原所有外觀更改'), [T('Every appearance override is removed.', '所有外觀覆寫都會移除。')], () => { setAp({}, 'Appearance reset all'); }));
    exp.addEventListener('click', () => A.download('appearance.json', 'application/json', JSON.stringify({ schemaVersion: 1, overrides: X().ap }, null, 2)));
    $('input', impL).addEventListener('change', (e) => { const f = e.target.files[0]; if (!f) return; if (f.size > 65536) { msg.textContent = T('The file is too large.', '檔案太大。'); return; } f.text().then((t) => { let o = null; try { o = JSON.parse(t); } catch (er) { /* ignore */ } const n = o && o.schemaVersion === 1 ? sanitizeAp(o.overrides) : null; if (!n) { msg.textContent = T('That file is not a valid appearance file, so nothing changed.', '呢個唔係有效嘅外觀檔案，所以冇改動。'); return; } setAp(n, 'Appearance imported'); refresh(); msg.textContent = T('Imported.', '已匯入。'); }); e.target.value = ''; });
    const box = h('div', { class: 'stack' }, h('label', { class: 'field' }, h('span', { text: T('Kind of element', '元素類別') }), sel), propBtns, picker, sRadius, sPad, sSize, sW, sLs, sample, h('div', { class: 'row' }, undoB, redoB, resetK, resetA), h('div', { class: 'row' }, exp, impL), msg, h('div', { class: 'row' }, h('span', { class: 'grow' }), h('button', { type: 'button', 'data-close': '1', text: T('Done', '完成') })));
    dialog(T('Appearance editor', '外觀編輯器'), box, { focus: '#ap-kind' }); refresh();
  }

  // ---------- Logo ----------
  const LOGO_KEY = 'hamu-logo';
  function applyLogo() {
    const mk = $('.mark'); if (!mk) return;
    const d = store.get('localStorage', LOGO_KEY);
    const img = mk.querySelector('img');
    if (d && /^data:image\/png;base64,/.test(d)) { if (!img) { mk.textContent = ''; mk.appendChild(h('img', { class: 'mark-img', alt: '', src: d, width: '36', height: '36' })); } else img.src = d; mk.classList.add('has-img'); }
    else { if (img) img.remove(); mk.classList.remove('has-img'); mk.textContent = X().school.on ? (X().school.name || 'Home app').slice(0, 2).toUpperCase() : 'HA'; }
  }
  function buildLogo(c) {
    const msg = h('p', { class: 'small', id: 'logo-msg', role: 'status' });
    const file = h('input', { type: 'file', id: 'logo-file', accept: 'image/png,image/jpeg,image/webp,image/svg+xml', hidden: '' });
    const pick = h('label', { class: 'btn tonal' }, h('span', { text: T('Choose an image', '揀圖片') }), file);
    const reset = h('button', { type: 'button', id: 'logo-reset', text: T('Use the shipped logo', '用返原本標誌') });
    const prev = h('div', { class: 'logo-prev' });
    function paint() { prev.textContent = ''; const d = store.get('localStorage', LOGO_KEY); prev.appendChild(d ? h('img', { src: d, alt: T('Your logo', '你嘅標誌'), width: '48', height: '48' }) : h('span', { class: 'muted small', text: T('The shipped logo is in use.', '用緊原本標誌。') })); }
    file.addEventListener('change', () => {
      const f = file.files[0]; if (!f) return; file.value = '';
      if (['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].indexOf(f.type) < 0) { msg.textContent = T('That file type is not accepted. Use PNG, JPEG, WebP or SVG.', '唔接受呢種檔案。請用 PNG、JPEG、WebP 或者 SVG。'); toast(msg.textContent); return; }
      if (f.size > 2 * 1024 * 1024) { msg.textContent = T('That image is larger than 2 MB.', '圖片超過 2 MB。'); toast(msg.textContent); return; }
      const url = URL.createObjectURL(f); const img = new Image();
      img.onload = () => {
        try {
          const cv = doc.createElement('canvas'); cv.width = 96; cv.height = 96; const g = cv.getContext('2d');
          const w = img.naturalWidth || 96; const hgt = img.naturalHeight || 96; const s = Math.min(96 / w, 96 / hgt); g.drawImage(img, (96 - w * s) / 2, (96 - hgt * s) / 2, w * s, hgt * s);
          const out = cv.toDataURL('image/png'); localStorage.setItem(LOGO_KEY, out); applyLogo(); paint(); sv('Logo changed', true);
          msg.textContent = T('Your logo is in use. It stays in this browser only.', '用緊你嘅標誌。只會留喺呢個瀏覽器。'); toast(T('Your logo is in use.', '用緊你嘅標誌。'));
        } catch (e) { msg.textContent = T('The image could not be converted or stored.', '轉換唔到或者儲存唔到呢張圖片。'); }
        URL.revokeObjectURL(url);
      };
      img.onerror = () => { URL.revokeObjectURL(url); msg.textContent = T('That image could not be read.', '讀唔到呢張圖片。'); };
      img.src = url;
    });
    reset.addEventListener('click', () => { try { localStorage.removeItem(LOGO_KEY); } catch (e) { /* ignore */ } applyLogo(); paint(); sv('Logo reset', true); msg.textContent = T('The shipped logo is back.', '已用返原本標誌。'); });
    c.append(h('div', { class: 'row' }, pick, reset, prev), h('p', { class: 'small muted', text: T('PNG, JPEG, WebP or SVG, up to 2 MB. SVG is only accepted because it is drawn through an image onto a canvas, so no script in it runs. The result is 96 px and never uploaded.', 'PNG、JPEG、WebP 或 SVG，最大 2 MB。SVG 只係經圖片畫落畫布先接受，所以入面嘅 script 唔會執行。結果係 96 px，絕不上傳。') }), msg);
  }

  // ---------- Toy locks ----------
  const enc = new TextEncoder();
  const sha = (s) => (window.crypto && crypto.subtle ? crypto.subtle.digest('SHA-256', enc.encode(s)).then((b) => Array.prototype.map.call(new Uint8Array(b), (x) => pad(x.toString(16))).join('')) : Promise.reject(new Error('no crypto')));
  const salt = () => { const a = new Uint8Array(16); crypto.getRandomValues(a); return Array.prototype.map.call(a, (x) => pad(x.toString(16))).join(''); };
  const pageKey = () => location.pathname.replace(/index\.html$/, '');
  function cssPath(el) { const p = []; while (el && el !== body && el.nodeType === 1) { if (el.id) { p.unshift('#' + CSS.escape(el.id)); return p.join('>'); } const par = el.parentElement; if (!par) break; p.unshift(`${el.tagName.toLowerCase()}:nth-child(${Array.prototype.indexOf.call(par.children, el) + 1})`); el = par; } return 'body>' + p.join('>'); }
  function applyLocks() {
    for (const e of $$('[data-locked]')) { e.removeAttribute('data-locked'); e.removeAttribute('inert'); e.removeAttribute('aria-disabled'); }
    for (const l of X().locks) { if (!l.on || l.page !== pageKey()) continue; let el = null; try { el = doc.querySelector(l.path); } catch (e) { /* ignore */ } if (el) { el.setAttribute('data-locked', l.id); el.setAttribute('inert', ''); el.setAttribute('aria-disabled', 'true'); } }
    window.dispatchEvent(new CustomEvent('hx-locks'));
  }
  function askPin(title, hint, cb, forgot) {
    let val = '';
    const dots = h('div', { class: 'pin-dots', id: 'pin-dots', role: 'img', 'aria-label': '0 / 4' });
    const msg = h('p', { class: 'small', id: 'pin-msg', role: 'status', text: hint });
    function paint() { dots.textContent = ''; for (let i = 0; i < 4; i++) dots.appendChild(h('i', { class: i < val.length ? 'on' : '' })); dots.setAttribute('aria-label', `${val.length} / 4`); }
    function press(d) { if (val.length < 4) { val += d; paint(); } if (val.length === 4) finish(); }
    function finish() { const v = val; val = ''; paint(); cb(v, msg); }
    const keys = h('div', { class: 'keypad' }, ...['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k) => { if (!k) return h('span'); const b = h('button', { type: 'button', class: 'key', 'data-k': k, 'aria-label': k === '⌫' ? T('Delete the last digit', '刪除最後一個數字') : k, text: k }); b.addEventListener('click', () => { if (k === '⌫') { val = val.slice(0, -1); paint(); } else press(k); }); return b; }));
    const box = h('div', { class: 'stack pinbox' }, h('p', { class: 'note', text: T('A toy lock: a speed bump for fun, not security. Anyone with browser tools can remove it.', '玩具鎖：純粹玩玩減速，唔係保安。任何人用瀏覽器工具都可以移除。') }), dots, msg, keys,
      h('div', { class: 'row' }, h('button', { type: 'button', 'data-close': '1', text: T('Cancel', '取消') }), forgot ? forgot : null));
    box.addEventListener('keydown', (e) => { if (/^[0-9]$/.test(e.key)) { e.preventDefault(); press(e.key); } else if (e.key === 'Backspace') { e.preventDefault(); val = val.slice(0, -1); paint(); } });
    dialog(title, box, { focus: '.key' }); paint();
  }
  function lockElement(el) {
    if (!el || el === body || el.closest('#ov,.ctxmenu,.site-header,#tabstrip')) { toast(T('That element cannot be locked.', '呢個元素鎖唔到。')); return; }
    const path = cssPath(el); const label = (el.textContent || el.tagName).replace(/\s+/g, ' ').trim().slice(0, 40) || el.tagName.toLowerCase();
    if (!window.crypto || !crypto.subtle) { toast(T('Locks are not available here: this page needs a secure context.', '呢度用唔到鎖：頁面需要安全環境。')); return; }
    let first = '';
    askPin(T('Set a 4-digit PIN', '設定 4 位 PIN'), T('Choose four digits.', '揀四個數字。'), (pin, msg) => {
      if (!first) { first = pin; msg.textContent = T('Enter the same four digits again.', '再輸入一次同樣嘅四個數字。'); return; }
      if (pin !== first) { first = ''; msg.textContent = T('They did not match. Start again with four digits.', '兩次唔一樣。請重新輸入四個數字。'); return; }
      const s = salt(); sha(s + pin).then((hash) => { X().locks.push({ id: 'k' + Date.now(), path, label, page: pageKey(), salt: s, hash, on: true }); sv(); closeDialog(); applyLocks(); paintLocks(); toast(T('Locked. This is a speed bump for fun, not security.', '已鎖。呢個只係玩玩減速，唔係保安。')); });
    });
  }
  function unlockWith(l, then) {
    const forgot = h('button', { type: 'button', id: 'pin-forgot', class: 'text', text: T('Forgotten the PIN', '唔記得 PIN') });
    forgot.addEventListener('click', () => { closeDialog(); A.superConfirm(T('Remove the lock', '移除呢個鎖'), [T(`The lock on "${l.label}" is removed without its PIN.`, `「${l.label}」嘅鎖會唔使 PIN 就移除。`)], () => { X().locks = X().locks.filter((x) => x !== l); sv(); applyLocks(); paintLocks(); toast(T('The lock was removed.', '已移除鎖。')); }); });
    askPin(T('Enter the PIN', '輸入 PIN'), T('Four digits.', '四個數字。'), (pin, msg) => { sha(l.salt + pin).then((hash) => { if (hash === l.hash) { closeDialog(); then(); } else msg.textContent = T('That is not the PIN. Try again.', '呢個唔係 PIN。再試。'); }); }, forgot);
  }
  let paintLocks = () => {};
  function buildLocks(c) {
    const list = h('ul', { class: 'rules', id: 'locks-list' });
    paintLocks = () => {
      list.textContent = '';
      if (!X().locks.length) list.appendChild(h('li', { class: 'muted', text: T('No locks. Right-click an element and choose Lock this element.', '未有鎖。喺元素上面撳右鍵，揀「鎖住呢個元素」。') }));
      X().locks.forEach((l) => {
        const onB = h('button', { type: 'button', class: 'text', 'data-act': l.on ? 'unlock' : 'lock', text: l.on ? T('Unlock', '解鎖') : T('Lock again', '再鎖') });
        onB.addEventListener('click', () => { if (l.on) unlockWith(l, () => { l.on = false; sv(); applyLocks(); paintLocks(); }); else { l.on = true; sv(); applyLocks(); paintLocks(); } });
        const rm = h('button', { type: 'button', class: 'text', 'data-act': 'remove', text: T('Remove', '移除') }); rm.addEventListener('click', () => { const go = () => { X().locks = X().locks.filter((x) => x !== l); sv(); applyLocks(); paintLocks(); }; if (l.on) unlockWith(l, go); else go(); });
        list.appendChild(h('li', { class: 'rule' }, h('div', { class: 'grow' }, h('b', { text: l.label }), h('div', { class: 'small muted', text: `${l.on ? T('Locked', '已鎖') : T('Unlocked', '已解鎖')}, ${l.page || '/'}` })), onB, rm));
      });
    };
    c.append(h('p', { class: 'note', text: T('Toy locks are a speed bump for fun and not security. The PIN is kept only as a salted SHA-256 digest in this browser, and anyone with browser tools can remove a lock.', '玩具鎖只係玩玩減速，唔係保安。PIN 只會以加鹽 SHA-256 摘要儲存喺呢個瀏覽器，任何人用瀏覽器工具都可以移除鎖。') }), list); paintLocks();
  }
  doc.addEventListener('click', (e) => { const r = e.target.closest('[data-reset="locks"]'); if (r) A.superConfirm(T('Remove all locks', '移除所有鎖'), [T('Every toy lock is removed without its PIN.', '所有玩具鎖會唔使 PIN 就移除。')], () => { X().locks = []; sv('Locks removed'); applyLocks(); paintLocks(); }); });

  // ---------- Animation editor ----------
  const AK = [['page', 'Page entry', '頁面進場'], ['card', 'Card stagger', '卡片錯開'], ['dialog', 'Dialogs and sheets', '對話框同面板'], ['toast', 'Toasts', '提示'], ['progress', 'Progress', '進度'], ['chart', 'Chart', '圖表'], ['tab', 'Tab change', '分頁切換'], ['hover', 'Hover lift', '懸停浮起']];
  const EASE = { standard: [0.2, 0, 0, 1], emphasized: [0.05, 0.7, 0.1, 1], spring: [0.34, 1.56, 0.64, 1], linear: null, custom: null };
  const easeCss = (k) => (k.ease === 'linear' ? 'linear' : `cubic-bezier(${(k.ease === 'custom' ? k.b : EASE[k.ease] || EASE.standard).join(',')})`);
  const baseKind = () => ({ on: true, dur: 420, del: 0, stg: 45, ease: 'standard', dist: 16, b: [0.2, 0, 0, 1] });
  const PROFILES = {
    Calm: (k) => Object.assign(baseKind(), { dur: 280, stg: 25, dist: k === 'hover' ? 2 : 8 }),
    Standard: (k) => Object.assign(baseKind(), k === 'hover' ? { dur: 160, dist: 3, stg: 0 } : k === 'dialog' || k === 'toast' ? { dur: 240, stg: 0, dist: 12 } : k === 'progress' || k === 'chart' ? { dur: 600, stg: 0, dist: 0 } : {}),
    Expressive: (k) => Object.assign(PROFILES.Standard(k), { dur: Math.round(PROFILES.Standard(k).dur * 1.3), stg: 60, dist: Math.round(PROFILES.Standard(k).dist * 1.5), ease: 'emphasized' }),
    Playful: (k) => Object.assign(PROFILES.Standard(k), { dur: Math.round(PROFILES.Standard(k).dur * 1.25) + 60, stg: 70, dist: Math.round(PROFILES.Standard(k).dist * 2), ease: 'spring' }),
  };
  const mkAnim = (name) => { const o = { master: true, speed: 1, profile: name, k: {} }; for (const [k] of AK) o.k[k] = PROFILES[name](k); return o; };
  const animState = () => X().anim || mkAnim('Standard');
  function applyAnim() {
    const a = animState();
    html.style.setProperty('--m-speed', String(a.speed));
    for (const [k] of AK) { const v = a.k[k]; if (!v) continue; html.style.setProperty(`--m-${k}-dur`, `${v.dur}ms`); html.style.setProperty(`--m-${k}-del`, `${v.del}ms`); html.style.setProperty(`--m-${k}-stg`, `${v.stg}ms`); html.style.setProperty(`--m-${k}-ease`, easeCss(v)); html.style.setProperty(`--m-${k}-dist`, `${v.dist}px`); html.classList.toggle(`m-off-${k}`, !v.on); }
    html.classList.toggle('m-off-all', !a.master);
    html.classList.toggle('m-rm', rmNow());
  }
  function sanitizeAnim(o) {
    if (!o || typeof o !== 'object' || !o.k || typeof o.k !== 'object') return null;
    const out = mkAnim('Standard'); out.master = o.master !== false; out.speed = clamp(+o.speed || 1, 0.25, 3); out.profile = String(o.profile || 'Custom').slice(0, 30);
    for (const [k] of AK) { const v = o.k[k]; if (!v || typeof v !== 'object') continue; const d = out.k[k]; d.on = v.on !== false; d.dur = clamp(+v.dur || 0, 0, 3000); d.del = clamp(+v.del || 0, 0, 2000); d.stg = clamp(+v.stg || 0, 0, 400); d.dist = clamp(+v.dist || 0, 0, 120); d.ease = EASE[v.ease] !== undefined ? v.ease : 'standard'; if (Array.isArray(v.b) && v.b.length === 4) d.b = v.b.map((n, i) => clamp(+n || 0, i % 2 ? -2 : 0, i % 2 ? 3 : 1)); }
    return out;
  }
  function buildAnim(c) {
    const a = () => { if (!X().anim) X().anim = mkAnim('Standard'); return X().anim; };
    const note = h('p', { class: 'note', id: 'anim-rm' });
    const master = HX.sw(T('Motion on', '動態開啟'), animState().master, (v) => { a().master = v; commit('Animation master'); }, 'anim-master');
    const speed = HX.slider(T('Global speed (1 is normal)', '整體速度（1 係正常）'), 0.25, 3, 0.05, animState().speed, (v) => { a().speed = v; commit('Animation speed'); }, 'anim-speed');
    const prof = h('select', { id: 'anim-profile', 'aria-label': T('Profile', '設定檔') });
    const saveName = h('input', { type: 'text', id: 'anim-save-name', maxlength: '24', placeholder: T('Name for your profile', '你嘅設定檔名稱'), 'aria-label': T('Profile name', '設定檔名稱') });
    const saveB = h('button', { type: 'button', id: 'anim-save', text: T('Save as a profile', '儲存做設定檔') }); const delB = h('button', { type: 'button', class: 'text', text: T('Delete this profile', '刪除呢個設定檔') });
    const exp = h('button', { type: 'button', id: 'anim-export', text: T('Export JSON', '匯出 JSON') }); const imp = h('label', { class: 'btn tonal' }, h('span', { text: T('Import JSON', '匯入 JSON') }), h('input', { type: 'file', accept: 'application/json,.json', id: 'anim-import', hidden: '' }));
    const kinds = h('div', { class: 'stack' });
    const commit = (w) => { applyAnim(); sv(w); };
    function fillProf() { prof.textContent = ''; for (const n of Object.keys(PROFILES).concat(Object.keys(X().profiles || {}))) prof.appendChild(h('option', { value: n, text: n })); prof.value = animState().profile; }
    prof.addEventListener('change', () => { const n = prof.value; const st = PROFILES[n] ? mkAnim(n) : sanitizeAnim(X().profiles[n]); if (!st) return; st.profile = n; X().anim = st; commit('Animation profile: ' + n); render(); });
    saveB.addEventListener('click', () => { const n = saveName.value.trim().slice(0, 24); if (!n || PROFILES[n]) { toast(T('Choose a name that is not a built-in profile.', '請揀一個唔係內置設定檔嘅名稱。')); return; } X().profiles = X().profiles || {}; const s = JSON.parse(JSON.stringify(a())); s.profile = n; X().profiles[n] = s; a().profile = n; commit('Animation profile saved'); fillProf(); toast(T('Profile saved.', '已儲存設定檔。')); });
    delB.addEventListener('click', () => { const n = prof.value; if (PROFILES[n]) { toast(T('Built-in profiles cannot be deleted.', '內置設定檔刪除唔到。')); return; } delete X().profiles[n]; X().anim = mkAnim('Standard'); commit('Animation profile deleted'); render(); });
    exp.addEventListener('click', () => A.download('animation.json', 'application/json', JSON.stringify(Object.assign({ schemaVersion: 1 }, a()), null, 2)));
    $('input', imp).addEventListener('change', (e) => { const f = e.target.files[0]; if (!f) return; f.text().then((t) => { let o = null; try { o = JSON.parse(t); } catch (er) { /* ignore */ } const s = o && o.schemaVersion === 1 ? sanitizeAnim(o) : null; if (!s) { toast(T('That file is not a valid animation file, so nothing changed.', '呢個唔係有效嘅動畫檔案，所以冇改動。')); return; } X().anim = s; commit('Animation imported'); render(); }); e.target.value = ''; });
    function curveSvg(v) { const NS = 'http://www.w3.org/2000/svg'; const svg = doc.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '-4 -4 108 108'); svg.setAttribute('class', 'curve'); svg.setAttribute('aria-hidden', 'true'); const b = v.ease === 'custom' ? v.b : EASE[v.ease] || [0, 0, 1, 1]; const p = doc.createElementNS(NS, 'path'); p.setAttribute('d', v.ease === 'linear' ? 'M0,100 L100,0' : `M0,100 C${b[0] * 100},${100 - b[1] * 100} ${b[2] * 100},${100 - b[3] * 100} 100,0`); p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'currentColor'); p.setAttribute('stroke-width', '3'); svg.appendChild(p); return svg; }
    function render() {
      kinds.textContent = '';
      for (const [k, en, yue] of AK) {
        const v = a().k[k] || baseKind(); a().k[k] = v;
        const on = HX.sw(T('On', '開'), v.on, (x) => { v.on = x; commit('Animation ' + k); }, `anim-${k}-on`);
        const mk = (p, label, min, max, step) => HX.slider(label, min, max, step, v[p], (x) => { v[p] = x; commit('Animation ' + k); }, `anim-${k}-${p}`);
        const ease = h('select', { id: `anim-${k}-ease`, 'aria-label': T('Easing', '緩動') }, ...['standard', 'emphasized', 'spring', 'linear', 'custom'].map((n) => h('option', { value: n, text: n })));
        ease.value = v.ease;
        const bez = [0, 1, 2, 3].map((i) => { const n = h('input', { type: 'number', class: 'num', step: '0.05', value: String(v.b[i]), id: `anim-${k}-b${i}`, 'aria-label': `${T('Curve point', '曲線點')} ${['x1', 'y1', 'x2', 'y2'][i]}`, disabled: v.ease !== 'custom' }); n.addEventListener('change', () => { v.b[i] = clamp(+n.value || 0, i % 2 ? -2 : 0, i % 2 ? 3 : 1); n.value = String(v.b[i]); commit('Animation curve'); cv.textContent = ''; cv.appendChild(curveSvg(v)); }); return n; });
        const cv = h('div', { class: 'curve-wrap' }, curveSvg(v));
        ease.addEventListener('change', () => { v.ease = ease.value; if (v.ease !== 'custom' && EASE[v.ease]) v.b = EASE[v.ease].slice(); bez.forEach((n, i) => { n.disabled = v.ease !== 'custom'; n.value = String(v.b[i]); }); commit('Animation ' + k); cv.textContent = ''; cv.appendChild(curveSvg(v)); });
        const box = h('div', { class: 'anim-prev', id: `anim-prev-${k}`, 'aria-hidden': 'true' });
        const play = h('button', { type: 'button', class: 'tonal', id: `anim-play-${k}`, text: T('Play preview', '播放預覽') });
        play.addEventListener('click', () => { if (rmNow()) { toast(T('Reduced motion is on, so nothing moves.', '減少動態開緊，所以唔會郁。')); return; } if (!v.on || !a().master) { toast(T('This motion is switched off.', '呢個動態已關閉。')); return; } const sp = a().speed || 1; const kf = k === 'chart' || k === 'progress' ? [{ width: '0%' }, { width: '100%' }] : k === 'hover' ? [{ transform: 'none' }, { transform: `translateY(-${v.dist}px)` }] : [{ opacity: 0, transform: `translateY(${v.dist}px)` }, { opacity: 1, transform: 'none' }]; box.animate(kf, { duration: Math.max(1, v.dur * sp), delay: v.del, easing: easeCss(v), fill: 'both' }); });
        const det = h('details', { class: 'anim-kind' }, h('summary', {}, h('b', { text: T(en, yue) }), ' ', on), h('div', { class: 'stack' }, mk('dur', T('Duration (ms)', '時長（毫秒）'), 0, 1500, 10), mk('del', T('Delay (ms)', '延遲（毫秒）'), 0, 1000, 10), mk('stg', T('Stagger (ms)', '錯開（毫秒）'), 0, 200, 5), mk('dist', T('Distance (px)', '距離（px）'), 0, 80, 1),
          h('div', { class: 'row' }, h('label', { class: 'field' }, h('span', { text: T('Easing', '緩動') }), ease), h('div', { class: 'row tight', role: 'group', 'aria-label': T('Cubic bezier points', '貝塞爾曲線點') }, ...bez), cv), h('div', { class: 'row' }, play, box)));
        kinds.appendChild(det);
      }
      master.set(a().master); speed.set(a().speed); fillProf(); A.applyLang(kinds);
    }
    function paintRm() { note.textContent = rmNow() ? T('Reduced motion is on in your system or in this site, so motion stays off whatever the editor says.', '你嘅系統或者呢個網站開咗減少動態，所以無論編輯器點設定，動態都會保持關閉。') : T('Reduced motion is off. If you turn it on, it always wins over these settings.', '減少動態未開。一開，就會永遠優先於呢啲設定。'); }
    c.append(note, master, speed, h('div', { class: 'row' }, h('label', { class: 'field' }, h('span', { text: T('Profile', '設定檔') }), prof), delB), h('div', { class: 'row' }, saveName, saveB), kinds, h('div', { class: 'row' }, exp, imp)); render(); paintRm();
    HX.addPaint(() => { paintRm(); fillProf(); master.set(animState().master); speed.set(animState().speed); });
    window.addEventListener('hx-restored', render);
  }

  // ---------- Settings hook ----------
  window.HX_SETTINGS_MORE = () => {
    let c;
    if ((c = HX.ctl('appear'))) { const open = h('button', { type: 'button', id: 'ap-open', class: 'filled', text: T('Open the appearance editor', '打開外觀編輯器') }); open.addEventListener('click', () => openAppearance('cards')); c.append(open, h('p', { class: 'small muted', text: T('Right-click any element and choose Appearance of this element to start from that kind.', '喺任何元素撳右鍵，揀「呢個元素嘅外觀」，就會由嗰一類開始。') })); }
    if ((c = HX.ctl('picker'))) { const open = h('button', { type: 'button', id: 'pk-open', class: 'tonal', text: T('Open the colour picker', '打開色彩選擇器') }); open.addEventListener('click', openPickerDialog); c.append(open); }
    if ((c = HX.ctl('logo'))) buildLogo(c);
    if ((c = HX.ctl('anim'))) buildAnim(c);
    if ((c = HX.ctl('locks'))) buildLocks(c);
    A.applyLang(body); A.applyVocab(body);
  };
  window.HX_APPLY_MORE = () => { applyAppearance(); applyAnim(); applyLogo(); applyLocks(); stagger(); };
  window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').addEventListener && matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', applyAnim);
  window.addEventListener('hx-locks', () => {});
  function stagger(root) { let i = 0; for (const e of $$('.vcard,.hl,.stat,.fact,.ft-row,.navcard,.tool-card,.setting-group,.cmp-b', root || doc)) { e.style.setProperty('--i', String(Math.min(i++, 14))); } let j = 0; for (const e of $$('.abar,.chip[data-area]', root || doc)) e.style.setProperty('--i', String(Math.min(j++, 10))); }

  // ---------- Context menu ----------
  let lastTarget = null;
  const known = (e) => (e && e.nodeType === 1 ? e : null);
  doc.addEventListener('pointerdown', (e) => { lastTarget = known(e.target); }, true);
  doc.addEventListener('focusin', (e) => { lastTarget = known(e.target); });
  function exportRowsOf(el) {
    const t = el.closest('table'); if (t) { const rows = $$('tr', t).map((tr) => $$('th,td', tr).map((c) => c.textContent.replace(/\s+/g, ' ').trim())); const cols = rows.shift() || []; return { title: (t.getAttribute('aria-label') || $('caption', t) && $('caption', t).textContent || 'Table'), cols: cols.map((c, i) => c || `col${i + 1}`), rows }; }
    const l = el.closest('ul,ol'); if (l) { const items = $$(':scope > li', l).filter((x) => !x.hidden).map((x) => [x.textContent.replace(/\s+/g, ' ').trim()]); if (items.length) return { title: 'List', cols: ['text'], rows: items }; }
    return null;
  }
  function openExport(d) {
    const box = h('div', { class: 'stack' }, h('p', { text: T(`${A.plural(d.rows.length, 'row', 'rows')} ready to export.`, `${d.rows.length} 行可以匯出。`) }), h('div', { class: 'row' }, ...[['json', 'JSON'], ['csv', 'CSV'], ['md', 'Markdown'], ['txt', 'Plain text'], ['html', 'HTML'], ['print', 'Print']].map(([k, l]) => { const b = h('button', { type: 'button', 'data-fmt': k, text: l }); b.addEventListener('click', () => { if (k === 'print') { A.printHtml(A.toFormat('html', d.title, d.cols, d.rows).text); } else { const o = A.toFormat(k, d.title, d.cols, d.rows); A.download(`export.${o.ext}`, o.type, o.text); } closeDialog(); toast(T('Exported.', '已匯出。')); }); return b; })));
    dialog(T('Export this', '匯出呢個'), box);
  }
  const copyText = (t, msg) => { const done = () => toast(msg || T('Copied.', '複製咗。')); if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, () => { toast(T('Copying is not available here.', '呢度用唔到複製。')); }); else toast(T('Copying is not available here.', '呢度用唔到複製。')); };
  const ACTIONS = {
    copy: { en: 'Copy text', yue: '複製文字', key: 'C', run: (el) => { const s = String(getSelection ? getSelection() : '') || el.textContent.replace(/\s+/g, ' ').trim(); copyText(s.slice(0, 5000)); } },
    link: { en: 'Copy link to this', yue: '複製呢個嘅連結', key: 'L', run: (el) => { let a = el.closest('a[href]'); let u; if (a) u = new URL(a.getAttribute('href'), location.href).href; else { const w = el.closest('[id]'); u = location.origin + location.pathname + (w ? '#' + w.id : ''); } copyText(u, T('Link copied.', '已複製連結。')); } },
    tab: { en: 'Open in tab', yue: '用分頁打開', key: 'O', when: (el) => !!el.closest('a[href]') && !!window.HXT, run: (el) => { const a = el.closest('a[href]'); window.HXT.open(new URL(a.getAttribute('href'), location.href).href); } },
    read: { en: 'Read aloud', yue: '朗讀', key: 'R', run: (el) => HX.read(el.closest('section,article,li,p,h1,h2,h3,tr') || el) },
    appear: { en: 'Appearance of this element', yue: '呢個元素嘅外觀', key: 'P', run: (el) => openAppearance(kindOf(el)) },
    lock: { en: 'Lock this element', yue: '鎖住呢個元素', key: 'K', run: (el) => lockElement(el.closest('section,article,li,.card,form,table,div') || el) },
    export: { en: 'Export this', yue: '匯出呢個', key: 'X', when: (el) => !!exportRowsOf(el), run: (el) => { const d = exportRowsOf(el); if (d) openExport(d); } },
  };
  let menuFrom = null;
  function closeMenu() { const m = $('.ctxmenu'); if (m) m.remove(); if (menuFrom && body.contains(menuFrom)) { try { menuFrom.focus({ preventScroll: true }); } catch (e) { /* ignore */ } } menuFrom = null; }
  function openMenu(el, x, y) {
    closeMenu(); menuFrom = doc.activeElement && doc.activeElement !== body ? doc.activeElement : null;
    const items = Object.keys(ACTIONS).filter((k) => !ACTIONS[k].when || ACTIONS[k].when(el));
    const m = h('div', { class: 'ctxmenu', role: 'menu', 'aria-label': T('Element menu', '元素選單'), tabindex: '-1' });
    for (const k of items) { const a = ACTIONS[k]; const b = h('button', { type: 'button', role: 'menuitem', 'data-ctx': k }, h('span', { text: T(a.en, a.yue) }), h('kbd', { text: `Alt+Shift+${a.key}` })); b.addEventListener('click', () => { const target = el; closeMenu(); a.run(target); }); m.appendChild(b); }
    body.appendChild(m);
    const r = m.getBoundingClientRect(); m.style.left = `${clamp(x, 8, Math.max(8, innerWidth - r.width - 8))}px`; m.style.top = `${clamp(y, 8, Math.max(8, innerHeight - r.height - 8))}px`;
    const first = $('button', m); if (first) first.focus();
    m.addEventListener('keydown', (e) => { const bs = $$('button', m); const i = bs.indexOf(doc.activeElement); if (e.key === 'ArrowDown') { e.preventDefault(); bs[(i + 1) % bs.length].focus(); } else if (e.key === 'ArrowUp') { e.preventDefault(); bs[(i - 1 + bs.length) % bs.length].focus(); } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeMenu(); } else if (e.key === 'Tab') { e.preventDefault(); closeMenu(); } });
    A.applyLang(m);
  }
  doc.addEventListener('contextmenu', (e) => {
    if (e.target.closest && e.target.closest('input[type="text"],input[type="search"],textarea,.ctxmenu,#ov')) { if (!e.target.closest('.ctxmenu')) return; }
    if (e.button === 2 && e.shiftKey) return; // the browser's own menu stays with Shift+right-click
    if (touchHeld === 'fired') { e.preventDefault(); touchHeld = ''; return; }
    e.preventDefault(); const el = known(e.target); if (!el) return;
    const kb = e.button === 0 && e.clientX === 0 && e.clientY === 0;
    if (kb) { const r = (doc.activeElement || el).getBoundingClientRect(); openMenu(doc.activeElement || el, r.left + 8, r.bottom); } else openMenu(el, e.clientX, e.clientY);
  });
  doc.addEventListener('keydown', (e) => {
    if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) { const el = known(doc.activeElement) || lastTarget; if (!el || (el.matches && el.matches('input[type="text"],input[type="search"],textarea'))) return; e.preventDefault(); const r = el.getBoundingClientRect(); openMenu(el, r.left + 8, r.bottom - 4); return; }
    if (e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey && !$('#ov') && /^Key[A-Z]$/.test(e.code)) {
      const k = e.code.slice(3); const a = Object.keys(ACTIONS).map((n) => ACTIONS[n]).find((x) => x.key === k); const el = known(doc.activeElement) !== body && known(doc.activeElement) ? doc.activeElement : lastTarget;
      if (a && el && (!a.when || a.when(el))) { e.preventDefault(); a.run(el); }
    }
  });
  doc.addEventListener('pointerdown', (e) => { if (!e.target.closest('.ctxmenu')) closeMenu(); });
  let touchHeld = ''; let touchTimer = 0; let tx = 0; let ty = 0;
  doc.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') return; tx = e.clientX; ty = e.clientY; touchHeld = ''; clearTimeout(touchTimer); const el = known(e.target); touchTimer = setTimeout(() => { touchHeld = 'fired'; if (el) openMenu(el, tx, ty); }, 600); }, true);
  doc.addEventListener('pointermove', (e) => { if (e.pointerType === 'touch' && (Math.abs(e.clientX - tx) > 10 || Math.abs(e.clientY - ty) > 10)) clearTimeout(touchTimer); });
  for (const t of ['pointerup', 'pointercancel']) doc.addEventListener(t, () => { clearTimeout(touchTimer); });
  window.HXT_ACTIONS = ACTIONS; window.HXT_menu = openMenu;

  // ---------- In-site tabs ----------
  const TK = 'hamu-tabs';
  let tabs = []; let activeId = ''; let seq = 1;
  const base = (u) => { const x = new URL(u, location.href); return x.origin + x.pathname.replace(/index\.html$/, ''); };
  const nice = (t) => String(t || '').replace(/ - Home Assistant Material updates$/, '').trim() || 'Home Assistant Material updates';
  function persist() { store.set('sessionStorage', TK, JSON.stringify({ active: activeId, tabs: tabs.map((t) => ({ id: t.id, url: t.url, title: t.title })) })); }
  const strip = () => $('#tabstrip');
  function render() {
    const s = strip(); if (!s) return;
    s.hidden = !tabs.length; html.classList.toggle('has-tabs', tabs.length > 0); s.textContent = '';
    if (!tabs.length) return;
    const list = h('div', { class: 'tablist2', role: 'tablist', 'aria-label': T('Open pages', '打開咗嘅頁面') });
    tabs.forEach((t, i) => {
      const on = t.id === activeId;
      const b = h('button', { type: 'button', role: 'tab', class: 'tab2', id: `t-${t.id}`, 'aria-selected': String(on), tabindex: on ? '0' : '-1', draggable: 'true', 'data-tid': t.id, title: t.title }, h('span', { class: 'tab2-t', text: t.title }));
      const x = h('button', { type: 'button', class: 'tab2-x', 'aria-label': `${T('Close tab', '關閉分頁')}: ${t.title}`, 'data-close-tab': t.id, text: '×' });
      const wrap = h('div', { class: `tab2w${on ? ' on' : ''}` }, b, x);
      b.addEventListener('click', () => activate(t.id));
      x.addEventListener('click', () => closeTab(t.id));
      b.addEventListener('keydown', (e) => {
        if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); const j = clamp(i + (e.key === 'ArrowLeft' ? -1 : 1), 0, tabs.length - 1); if (j !== i) { tabs.splice(j, 0, tabs.splice(i, 1)[0]); persist(); render(); const nb = $(`#t-${t.id}`); if (nb) nb.focus(); } return; }
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length]; const nb = $(`#t-${n.id}`); if (nb) nb.focus(); }
        else if (e.key === 'Delete') { e.preventDefault(); closeTab(t.id); }
      });
      b.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', t.id); e.dataTransfer.effectAllowed = 'move'; });
      wrap.addEventListener('dragover', (e) => { e.preventDefault(); });
      wrap.addEventListener('drop', (e) => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain'); const from = tabs.findIndex((x2) => x2.id === id); if (from < 0 || id === t.id) return; const mv = tabs.splice(from, 1)[0]; tabs.splice(tabs.findIndex((x2) => x2.id === t.id), 0, mv); persist(); render(); });
      list.appendChild(wrap);
    });
    const add = h('button', { type: 'button', id: 'tab-new', class: 'tonal', text: T('New tab', '新分頁') }); add.addEventListener('click', openCatalog);
    const others = h('button', { type: 'button', id: 'tab-others', class: 'text', text: T('Close others', '關閉其他'), disabled: tabs.length < 2 }); others.addEventListener('click', () => { tabs = tabs.filter((t) => t.id === activeId); persist(); render(); });
    s.append(h('div', { class: 'wrap tabrow' }, list, add, others));
    A.applyLang(s);
  }
  function loadMain(url) {
    return fetch(url, { headers: { Accept: 'text/html' } }).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); }).then((txt) => {
      const d = new DOMParser().parseFromString(txt, 'text/html'); const m = d.querySelector('main'); if (!m) throw new Error('no main');
      const imp = doc.importNode(m, true);
      for (const e of [imp].concat($$('[href],[src],[data-src],[action],[data-tabhref]', imp))) for (const a of ['href', 'src', 'data-src', 'action', 'data-tabhref']) { const v = e.getAttribute && e.getAttribute(a); if (v && !/^(#|https?:|mailto:|data:|javascript:)/i.test(v)) e.setAttribute(a, new URL(v, url).href); }
      for (const e of $$('script', imp)) e.remove();
      imp.id = 'main';
      return { el: imp, title: nice(d.title), page: d.body.getAttribute('data-page') || '', build: d.body.getAttribute('data-build') || '' };
    });
  }
  async function activate(id, opts) {
    opts = opts || {};
    const t = tabs.find((x) => x.id === id); if (!t) return;
    const cur = tabs.find((x) => x.id === activeId); const main = $('#main');
    if (cur && cur !== t && main) { cur.scroll = window.scrollY; cur.el = main; cur.url = location.href; }
    let el = t.el;
    if (!el || opts.force) {
      try { const r = await loadMain(t.url); el = r.el; t.title = r.title; t.page = r.page; t.build = r.build; t.el = el; t.fresh = true; } catch (e) { toast(T('That page could not be opened in a tab, so it opens normally.', '呢頁用分頁打開唔到，所以用一般方式打開。')); location.href = t.url; return; }
    }
    if (main && main !== el) main.replaceWith(el);
    if (el.id !== 'main') el.id = 'main';
    if (t.page) body.setAttribute('data-page', t.page);
    if (t.build) body.setAttribute('data-build', t.build); else body.removeAttribute('data-build');
    doc.title = `${t.title} - Home Assistant Material updates`; activeId = t.id;
    if (t.fresh) { t.fresh = false; A.applyLang(el); A.applyVocab(el); if (t.page) { try { A.initPage(t.page); } catch (e) { if (window.console) console.warn('tab init:', e && e.message); } if (window.HTOOLS) window.HTOOLS.init(t.page, el); } }
    if (!opts.nopush) { try { history.pushState({ tab: t.id }, '', t.url); } catch (e) { /* ignore */ } }
    el.classList.remove('tab-swap'); void el.offsetWidth; el.classList.add('tab-swap');
    persist(); render(); HX.pageReady(); stagger(el); applyLocks(); window.dispatchEvent(new CustomEvent('hx-tab', { detail: { id: t.id } }));
    window.scrollTo(0, opts.force ? 0 : t.scroll || 0);
  }
  function ensureFirst() { if (tabs.length) return; const id = `t${seq++}`; tabs.push({ id, url: location.href, title: nice(doc.title), page: body.getAttribute('data-page') || '', build: body.getAttribute('data-build') || '', el: null, fresh: false }); activeId = id; }
  function openTab(url, background) {
    ensureFirst();
    const u = new URL(url, location.href).href; const hit = tabs.find((t) => base(t.url) === base(u));
    if (hit) { if (!background) activate(hit.id); return hit; }
    const id = `t${seq++}`; const t = { id, url: u, title: nice(u.split('/').filter(Boolean).slice(-1)[0] || 'Page'), page: '', build: '', el: null, fresh: false };
    tabs.push(t); persist(); render();
    if (!background) activate(id); else toast(T('Opened in a tab.', '已用分頁打開。'));
    return t;
  }
  function closeTab(id) {
    const i = tabs.findIndex((t) => t.id === id); if (i < 0) return; const wasActive = id === activeId;
    tabs.splice(i, 1);
    if (!tabs.length) { activeId = ''; persist(); render(); return; }
    if (wasActive) { const n = tabs[Math.min(i, tabs.length - 1)]; n.el = n.el || null; const old = $('#main'); activeId = ''; activate(n.id, { force: !n.el }).then(() => { void old; }); } else { persist(); render(); }
  }
  function openCatalog() {
    const q = h('input', { type: 'search', id: 'tabcat-q', placeholder: T('Search every page', '搜尋每一頁'), 'aria-label': T('Search every page', '搜尋每一頁'), autocomplete: 'off' });
    const rb = h('button', { type: 'button', class: 'pill-icon regex-btn', 'data-regex': 'tabcat-q', 'aria-label': T('Pattern builder for this search', '呢個搜尋嘅樣式建構器') }, doc.createRange().createContextualFragment('<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 17.5v.01M12 5v9M8 7.5l8 4M16 7.5l-8 4"/></svg>'));
    const ul = h('ul', { class: 'cmd-list', id: 'tabcat-list', role: 'listbox', 'aria-label': T('Pages', '頁面') }); const cnt = h('p', { class: 'small muted', 'aria-live': 'polite' });
    let items = [];
    function draw() {
      const mt = A.compile(q.value); ul.textContent = ''; let n = 0;
      for (const it of items) { if (!(it.href && it.kind !== 'Setting' || it.kind === 'Setting') ) continue; if (!(mt.none || (mt.ok && mt.test(`${it.kind} ${it.label} ${it.yue || ''} ${it.sub || ''}`)))) continue; if (n++ >= 120) break; const li = h('li', { role: 'option', tabindex: '0' }, h('b', { text: it.label }), ' ', h('span', { class: 'small muted', text: it.kind })); const go = () => { closeDialog(); openTab(A.ROOT + it.href); }; li.addEventListener('click', go); li.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); }); ul.appendChild(li); }
      cnt.textContent = n ? T(`${n} shown`, `顯示 ${n} 項`) : T('Nothing matches.', '冇嘢夾到。');
    }
    q.addEventListener('input', draw);
    dialog(T('New tab: every page', '新分頁：每一頁'), h('div', { class: 'stack' }, h('div', { class: 'find' }, q, rb), cnt, ul), { focus: '#tabcat-q' });
    A.getJson(`${A.ROOT}data/pages.json`).then((d) => { items = d.items; draw(); }).catch(() => { cnt.textContent = T('The page list could not be loaded.', '載入唔到頁面清單。'); });
  }
  doc.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tabhref]'); if (b) { e.preventDefault(); openTab(new URL(b.dataset.tabhref, location.href).href); return; }
    if (!tabs.length || e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]'); if (!a || a.target || a.hasAttribute('download') || a.closest('#ov')) return;
    let u; try { u = new URL(a.href); } catch (er) { return; } if (u.origin !== location.origin || !/(\/|\.html)$/.test(u.pathname)) return;
    if (u.pathname === location.pathname && u.search === location.search) return;
    e.preventDefault(); const t = tabs.find((x) => x.id === activeId); if (!t) return; t.url = u.href; t.el = null; t.scroll = 0;
    const main = $('#main'); void main; activate(t.id, { force: true });
  });
  window.addEventListener('popstate', () => { const t = tabs.find((x) => base(x.url) === base(location.href)); if (t && t.id !== activeId) activate(t.id, { nopush: true }); else if (!t && tabs.length) location.reload(); });
  function decorateTabs(root) { for (const l of $$('.vcard .vlinks', root || doc)) { if ($('.tab-open', l)) continue; const a = $('a', l); if (!a) continue; const b = h('button', { type: 'button', class: 'text tab-open', 'data-tabhref': a.getAttribute('href'), text: T('Open in a tab', '用分頁打開') }); l.appendChild(b); } }
  window.HXT = { open: openTab, tabs: () => tabs.map((t) => ({ id: t.id, url: t.url, title: t.title })), active: () => activeId, close: closeTab };
  window.addEventListener('hx-tab', () => decorateTabs()); window.addEventListener('hamu-lang', () => { render(); });
  // restore the tabs of this visit
  try {
    const st = JSON.parse(store.get('sessionStorage', TK) || 'null');
    if (st && Array.isArray(st.tabs) && st.tabs.length) {
      tabs = st.tabs.map((t) => ({ id: t.id, url: t.url, title: t.title, page: '', build: '', el: null, fresh: false }));
      seq = tabs.reduce((m, t) => Math.max(m, (+String(t.id).slice(1) || 0) + 1), 1);
      const here = tabs.find((t) => base(t.url) === base(location.href));
      if (here) { activeId = here.id; here.url = location.href; here.page = body.getAttribute('data-page') || ''; } else { const id = `t${seq++}`; tabs.push({ id, url: location.href, title: nice(doc.title), page: body.getAttribute('data-page') || '', build: '', el: null, fresh: false }); activeId = id; }
      persist(); render();
    }
  } catch (e) { /* ignore */ }
  decorateTabs(); stagger(); window.HX_APPLY_MORE();
  HX.pageReady();
})();
