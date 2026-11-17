/* Site extras, part 1: tone (playfulness), emoji, school mode, reading aids, schedules, narrator, dim sum surprise,
   local history, the guided update wizard, the phone menu sheet and the settings controls for all of them.
   No dependencies, no cookies, no network. Everything is kept in this browser only. */
(() => {
  'use strict';
  const A = window.HAMU;
  if (!A) return;
  const { T, toast, dialog, closeDialog, h, $, $$, store } = A;
  const doc = document; const html = doc.documentElement; const body = doc.body;
  const KEY = 'hamu-x'; const HKEY = 'hamu-hist';
  const pad = (n) => (n < 10 ? '0' : '') + n;
  const clock = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const defaults = () => ({ play: { en: 3, yue: 3 }, emoji: false, narr: { ve: '', vy: '', rate: 1, pitch: 1, auto: false }, aids: { focus: false, calm: false, reading: false }, rules: [], school: { on: false, name: 'Home app' }, dim: true, anim: null, profiles: {}, ap: {}, locks: [], recent: [] });
  let X = defaults();
  try { const s = JSON.parse(store.get('localStorage', KEY) || 'null'); if (s && typeof s === 'object') X = Object.assign(defaults(), s, { play: Object.assign(defaults().play, s.play), narr: Object.assign(defaults().narr, s.narr), aids: Object.assign(defaults().aids, s.aids), school: Object.assign(defaults().school, s.school) }); } catch (e) { /* ignore */ }

  // ---------- Local history ----------
  let hist = [];
  try { hist = JSON.parse(store.get('localStorage', HKEY) || '[]'); if (!Array.isArray(hist)) hist = []; } catch (e) { hist = []; }
  const logoNow = () => store.get('localStorage', 'hamu-logo') || '';
  function snapshot(withLogo) {
    const x = JSON.parse(JSON.stringify(X)); delete x.locks; delete x.recent;
    const s = A.SET(); const o = { x, set: { theme: s.theme, ts: s.ts, contrast: s.contrast, targets: s.targets, motion: s.motion } };
    if (withLogo) o.logo = logoNow();
    return o;
  }
  let quietHist = false;
  function record(what, withLogo) {
    if (quietHist) return;
    const snap = snapshot(withLogo); const key = JSON.stringify(snap);
    const last = hist[0];
    if (last && JSON.stringify(last.snap) === key) return;
    hist.unshift({ t: Date.now(), what, snap });
    hist = hist.slice(0, 100);
    let tries = 0;
    while (tries++ < 100) { try { localStorage.setItem(HKEY, JSON.stringify(hist)); break; } catch (e) { if (hist.length <= 1) break; hist.pop(); } }
    window.dispatchEvent(new CustomEvent('hx-hist'));
  }
  window.HX_REC = (what) => record(what);
  function save(what, withLogo) { store.set('localStorage', KEY, JSON.stringify(X)); if (what) record(what, withLogo); }
  function restoreEntry(e) {
    quietHist = true;
    const d = defaults(); const keepLocks = X.locks; const keepRecent = X.recent;
    X = Object.assign(d, e.snap.x, { locks: keepLocks, recent: keepRecent });
    X.play = Object.assign(d.play, X.play); X.narr = Object.assign(defaults().narr, X.narr); X.aids = Object.assign(defaults().aids, X.aids); X.school = Object.assign(defaults().school, X.school);
    const s = A.SET(); Object.assign(s, e.snap.set);
    if (e.snap.logo !== undefined) { if (e.snap.logo) store.set('localStorage', 'hamu-logo', e.snap.logo); else { try { localStorage.removeItem('hamu-logo'); } catch (er) { /* ignore */ } } }
    A.saveSet(); A.applySet(); store.set('localStorage', KEY, JSON.stringify(X));
    quietHist = false; applyAll(); window.dispatchEvent(new CustomEvent('hx-restored'));
    record('Restored the entry from ' + new Date(e.t).toLocaleString('en-CA', { hour12: false }), e.snap.logo !== undefined);
  }

  // ---------- Tone: playfulness levels for the site's own wording ----------
  const PF = [
    [['Release notes for every version', 'Every update, in plain words', 'Every update, explained', 'Every update, explained properly!', 'Every single update, decoded and served warm!'], ['每個版本嘅更新說明', '每個更新，用淺白說話講', '每個更新，講清楚', '每個更新，細細聲講清楚！', '每個更新，攪攪震都講到你明！']],
    [['Version comparison', 'Compare versions', 'Compare two versions', 'Pit two versions against each other', 'Which version wins? Compare two!'], ['版本比較', '比較版本', '比較兩個版本', '兩個版本一齊嚟比一比', '邊個版本叻啲？揀兩個比！']],
    [['Feature inventory and status', 'Features and their status', 'Features and their honest state', 'Features, and the honest truth about each', 'Every feature, with no fibbing about it!'], ['功能清單同狀態', '功能同佢哋嘅狀態', '功能同佢哋嘅真實狀態', '功能，同每樣嘅老實話', '每個功能，絕不呃你！']],
    [['Settings', 'Settings', 'Settings', 'Settings, your way', 'Knobs, dials and switches!'], ['設定', '設定', '設定', '你嘅設定，你話事', '掣、轉盤同開關！']],
    [['Number of changes per day', 'Changes each day', 'Changes per day', 'How busy each day was', 'Busy days, busy bees!'], ['每日更改數目', '每日嘅更改', '每日更改數目', '每日幾忙', '忙碌嘅日子，勤力嘅蜜蜂！']],
    [['Calendar', 'Calendar', 'Calendar', 'Release calendar', 'Release days on the calendar!'], ['日曆', '日曆', '日曆', '發佈日曆', '日曆上面嘅發佈日！']],
    [['Versions', 'Versions', 'Versions', 'All the versions', 'The version parade!'], ['版本', '版本', '版本', '全部版本', '版本大巡遊！']],
    [['Highlights', 'Highlights', 'Highlights', 'The good bits', 'The star turns!'], ['精選', '精選', '精選', '精彩位', '最精彩嘅部分！']],
    [['Open the notes', 'Read the notes', 'Read the notes', 'Dive into the notes', 'Dive into the juicy notes!'], ['打開說明', '睇說明', '睇更新說明', '撲入去睇說明', '撲入去睇啲精彩說明！']],
    [['Open the demos', 'Try the demos', 'Try the demos', 'Have a go with the demos', 'Play with the demos!'], ['打開示範', '試吓示範', '試示範', '玩吓示範', '快啲玩示範啦！']],
    [['Remove all filters', 'Clear the filters', 'Clear filters', 'Wipe the filters away', 'Poof! Filters gone!'], ['移除全部篩選', '清除篩選器', '清除篩選', '抹走啲篩選', '嘭！篩選冇晒！']],
    [['Go to the newest', 'Jump to the newest', 'Jump to newest', 'Zoom to the newest', 'Whoosh to the newest!'], ['去最新', '跳去最新嗰個', '跳去最新', '飛去最新', '咻一聲飛去最新！']],
    [['Begin the demo', 'Start the demo now', 'Start the demo', 'Fire up the demo', 'Light up the demo!'], ['開始示範', '而家開始示範', '開始示範', '發動示範', '燃亮示範！']],
    [['Skip to the main content', 'Skip to the content', 'Skip to the content', 'Hop straight to the content', 'Leap to the good stuff!'], ['跳到主要內容', '跳去內容', '跳到內容', '直接跳去內容', '一躍跳去精彩內容！']],
    [['Search the site', 'Search all', 'Search everything', 'Hunt through everything', 'Go on, search the lot!'], ['搜尋網站', '全部搜尋', '搜尋全部', '全部搵一搵', '嚟，全部搵晒佢！']],
    [['Setting saved.', 'Saved.', 'Saved.', 'Saved! Neat.', 'Saved! You absolute legend!'], ['設定已儲存。', '儲存咗。', '已儲存。', '儲起咗！', '儲好晒！你真係叻！']],
    [['The setting was reset to its default.', 'Reset to its default.', 'Back to its default.', 'Back to normal, good as new.', 'Poof, back to factory fresh!'], ['設定已還原為預設值。', '已還原預設。', '已還原預設值。', '返回原狀，好似新嘅一樣。', '嘭，返晒出廠狀態！']],
    [['Copied to the clipboard.', 'Copied.', 'Copied.', 'Copied, ready to paste!', 'Copied! Paste away!'], ['已複製到剪貼簿。', '已複製。', '複製咗。', '複製咗，隨時貼！', '複製晒！貼啦！']],
    [['There is nothing to export here.', 'Nothing to export.', 'Nothing to export here.', 'Nothing here to export, sorry.', 'Empty! Nothing to export here!'], ['呢度冇嘢可以匯出。', '冇嘢匯出。', '呢度冇嘢可以匯出。', '呢度冇嘢匯出喎。', '空空如也！冇嘢匯出！']],
    [['No results match.', 'No match.', 'Nothing matches.', 'Nothing matches, try another word.', 'Crickets... nothing matches!'], ['冇結果夾到。', '冇夾到。', '冇嘢夾到。', '冇嘢夾到，試吓第二個字。', '靜曬... 冇嘢夾到！']],
    [['No setting matches the search.', 'No setting found.', 'No setting matches.', 'No setting matches, try again.', 'No such setting. Try another word!'], ['冇設定夾到搜尋。', '搵唔到設定。', '冇設定夾到。', '冇設定夾到，再試吓。', '搵唔到呢個設定。試第二個字！']],
    [['A demo is not available yet', 'No demo yet', 'Demo not available yet', 'Demo is still in the oven', 'Demo is still baking!'], ['暫時未有示範', '未有示範', '暫時未有示範', '示範仲喺焗爐入面', '示範仲喺度焗緊！']],
    [['All settings were reset to their defaults.', 'Everything is back to default.', 'Everything is back to its default.', 'All clean, everything reset.', 'A fresh start, everything reset!'], ['所有設定已還原為預設值。', '全部返到預設。', '全部已經還原預設值。', '乾乾淨淨，全部還原。', '重新開始，全部還原晒！']],
    [['Your wording file is now in use.', 'Your wording file is in use.', 'Your wording file is in use.', 'Your words are in charge now.', 'Your words rule the page now!'], ['你嘅用字檔案已經啟用。', '用緊你嘅用字檔案。', '用緊你嘅用字檔案。', '你嘅用字而家話事。', '你嘅用字而家統治成頁！']],
  ];
  const PFM = {}; PF.forEach(([en, yue]) => { PFM[en[2]] = { en, yue }; });
  let eff = { play: { en: 3, yue: 3 }, emoji: false };
  let ruleNow = null; let ruleSaved = null;
  const playLevels = () => (X.school.on ? { en: 1, yue: 1 } : (ruleNow && ruleNow.play ? { en: +ruleNow.play, yue: +ruleNow.play } : X.play));
  window.HX_TONE = (en, yue) => { const e = PFM[en]; if (!e) return [en, yue]; const l = playLevels(); return [e.en[l.en - 1], yue === e.yue[2] ? e.yue[l.yue - 1] : yue]; };
  const errRe = /could not|not available|not used|larger than|failed|nothing to|cannot|unavailable|no voice|too large|not valid|rejected|refused/i;
  window.HX_TOAST = (text) => { if (X.aids.calm && !errRe.test(text)) return null; return emojiOn() ? `✨ ${text}` : text; };
  window.HX_DLG = (t) => (emojiOn() ? `💬 ${t}` : t);
  const emojiOn = () => !X.school.on && X.emoji;
  function retone(root) {
    for (const el of $$('[data-yue]', root || doc)) {
      let key = el.dataset.pf;
      if (!key) { const en = (el.dataset.en !== undefined ? el.dataset.en : el.textContent).trim(); if (PFM[en]) { key = en; el.dataset.pf = en; } else continue; }
      const l = playLevels(); const e = PFM[key];
      el.dataset.en = e.en[l.en - 1]; el.setAttribute('data-yue', e.yue[l.yue - 1]); A.applyLang(el); A.applyVocab(el);
    }
    window.dispatchEvent(new CustomEvent('hx-retoned'));
  }

  // ---------- School mode ----------
  const nameEls = () => $$('.brand-t');
  function applySchool() {
    const on = X.school.on;
    html.classList.toggle('school', on);
    const nm = (X.school.name || 'Home app').slice(0, 40);
    for (const e of nameEls()) {
      if (e.dataset.orig === undefined) e.dataset.orig = e.dataset.en !== undefined ? e.dataset.en : e.textContent;
      if (on) { e.removeAttribute('data-yue'); e.textContent = nm; } else if (e.dataset.orig) { e.textContent = e.dataset.orig; }
    }
    if (!on) for (const e of nameEls()) { e.setAttribute('data-yue', e.classList.contains('brand-short') ? 'HA Material 更新' : 'Home Assistant Material 更新'); e.removeAttribute('data-en'); }
    const mk = $('.mark'); if (mk && !mk.querySelector('img')) mk.textContent = on ? nm.slice(0, 2).toUpperCase() : 'HA';
    if (on) { doc.title = doc.title.replace(/Home Assistant Material updates/, nm); } else { doc.title = doc.title.replace(new RegExp(nm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 'Home Assistant Material updates'); }
    retone(); if (on) stopDim();
  }

  // ---------- Reading aids ----------
  let ruler = null;
  function applyAids() {
    html.classList.toggle('aid-focus', !!X.aids.focus); html.classList.toggle('aid-calm', !!X.aids.calm); html.classList.toggle('aid-reading', !!X.aids.reading);
    let peek = $('#focus-rest');
    if (X.aids.focus) {
      if (!peek) { peek = h('button', { type: 'button', id: 'focus-rest', class: 'filled focus-rest', text: T('Show the rest of the page', '顯示頁面其餘部分') }); peek.addEventListener('click', () => { html.classList.toggle('aid-peek'); peek.textContent = html.classList.contains('aid-peek') ? T('Back to focus', '返回專注') : T('Show the rest of the page', '顯示頁面其餘部分'); }); body.appendChild(peek); }
    } else { if (peek) peek.remove(); html.classList.remove('aid-peek'); }
    if (X.aids.reading) {
      if (!ruler) { ruler = h('div', { class: 'ruler', 'aria-hidden': 'true' }); body.appendChild(ruler); }
      ruler.hidden = false;
    } else if (ruler) ruler.hidden = true;
  }
  const moveRuler = (y) => { if (ruler && !ruler.hidden) ruler.style.setProperty('--ry', `${Math.max(0, y - 22)}px`); };
  doc.addEventListener('pointermove', (e) => moveRuler(e.clientY));
  doc.addEventListener('focusin', (e) => { if (!X.aids.reading || !e.target.getBoundingClientRect) return; const r = e.target.getBoundingClientRect(); moveRuler(r.top + r.height / 2); });

  // ---------- Scheduled settings ----------
  const toMin = (s) => { const m = /^(\d{1,2}):(\d{2})$/.exec(s || ''); return m ? (+m[1]) * 60 + (+m[2]) : -1; };
  function ruleActive(r, now) {
    if (!r.on) return false;
    const a = toMin(r.from); const b = toMin(r.to); if (a < 0 || b < 0) return false;
    const m = now.getHours() * 60 + now.getMinutes(); const d = now.getDay(); const prev = (d + 6) % 7;
    const days = Array.isArray(r.days) && r.days.length ? r.days : [0, 1, 2, 3, 4, 5, 6];
    if (a === b) return days.indexOf(d) >= 0;
    if (a < b) return days.indexOf(d) >= 0 && m >= a && m < b;
    return (m >= a && days.indexOf(d) >= 0) || (m < b && days.indexOf(prev) >= 0);
  }
  function applySchedule(nowOverride) {
    const now = nowOverride || new Date();
    const hit = X.rules.find((r) => ruleActive(r, now)) || null;
    const id = hit ? hit.id : null; const was = ruleNow ? ruleNow.id : null;
    if (id !== was) {
      const s = A.SET();
      if (hit && !ruleNow) ruleSaved = { lang: A.getLang(), theme: s.theme };
      ruleNow = hit;
      if (hit) { if (hit.lang) A.setLang(hit.lang, true); if (hit.theme) { s.theme = hit.theme; A.applySet(); } }
      else if (ruleSaved) { A.setLang(ruleSaved.lang, true); s.theme = ruleSaved.theme; A.applySet(); ruleSaved = null; }
      retone();
    }
    const line = $('#sched-now'); if (line) line.textContent = ruleNow ? T(`Active now: the rule "${ruleNow.name || ruleNow.from + ' to ' + ruleNow.to}".`, `而家生效：規則「${ruleNow.name || ruleNow.from + ' 至 ' + ruleNow.to}」。`) : T('No rule is active now.', '而家冇規則生效。');
    return ruleNow;
  }

  // ---------- Narrator (speech synthesis) ----------
  const syn = window.speechSynthesis;
  const voices = () => (syn && syn.getVoices ? syn.getVoices() : []);
  const isYue = (v) => /^(yue|zh[-_]hk|zh[-_]yue)/i.test(v.lang) || /cantonese|粵|粤|sinji|hiugaai|wanlung/i.test(v.name);
  const voiceFor = (lg) => {
    const all = voices(); const name = lg === 'yue' ? X.narr.vy : X.narr.ve;
    const named = all.find((v) => v.name === name); if (named) return named;
    if (lg === 'yue') return all.find(isYue) || null;
    return all.find((v) => /^en[-_](gb|ca|us)/i.test(v.lang)) || all.find((v) => /^en/i.test(v.lang)) || null;
  };
  let narrStatus = '';
  function narrBar(on, msg) {
    let bar = $('#narr-bar');
    if (!on) { if (bar) bar.remove(); return; }
    if (!bar) {
      const pause = h('button', { type: 'button', id: 'narr-pause', text: T('Pause', '暫停') });
      const stop = h('button', { type: 'button', id: 'narr-stop', text: T('Stop', '停止') });
      pause.addEventListener('click', () => { if (!syn) return; if (syn.paused) { syn.resume(); pause.textContent = T('Pause', '暫停'); } else { syn.pause(); pause.textContent = T('Resume', '繼續'); } });
      stop.addEventListener('click', stopRead);
      bar = h('div', { id: 'narr-bar', class: 'narr-bar', role: 'region', 'aria-label': T('Narrator controls', '朗讀控制') }, h('span', { id: 'narr-msg', role: 'status' }), pause, stop);
      body.appendChild(bar);
    }
    $('#narr-msg').textContent = msg || '';
  }
  function stopRead() { if (syn) { try { syn.cancel(); } catch (e) { /* ignore */ } } narrBar(false); }
  function segmentsOf(root) {
    const out = [];
    for (const el of $$('h1,h2,h3,p,li,summary,td,th,.hero-line', root)) {
      if (!el.offsetParent && el !== root) continue;
      if (el.closest('[hidden],script,style,.toasts,.narr-bar') || el.querySelector('p,li,h2,h3')) continue;
      const l2 = $$('.l2', el);
      if (l2.length) { const en = Array.prototype.filter.call(el.childNodes, (n) => !(n.nodeType === 1 && n.classList.contains('l2'))).map((n) => n.textContent).join(' ').trim(); if (en) out.push({ text: en, lang: 'en' }); const y = l2.map((n) => n.textContent).join(' ').trim(); if (y) out.push({ text: y, lang: 'yue' }); continue; }
      const t = el.textContent.replace(/\s+/g, ' ').trim(); if (!t) continue;
      out.push({ text: t, lang: el.closest('[lang="yue"]') ? 'yue' : 'en' });
    }
    return out;
  }
  function read(root) {
    if (!syn || typeof window.SpeechSynthesisUtterance !== 'function') { const m = T('This browser has no speech synthesis, so nothing can be read aloud.', '呢個瀏覽器冇語音合成，所以唔可以朗讀。'); narrStatus = m; toast(m); return false; }
    const start = () => {
      if (!voices().length) { const m = T('No voices were found on this device, so nothing can be read aloud. Install a system voice and reload.', '呢部機搵唔到任何聲音，所以唔可以朗讀。請安裝系統語音再重新載入。'); narrStatus = m; toast(m); paintNarrState(); return; }
      let segs = segmentsOf(root || $('#main') || body);
      const noYue = !voiceFor('yue');
      const skipped = noYue ? segs.filter((s) => s.lang === 'yue').length : 0;
      if (noYue) segs = segs.filter((s) => s.lang !== 'yue');
      if (!segs.length) { toast(T('There is no text to read here.', '呢度冇文字可以朗讀。')); return; }
      syn.cancel();
      narrBar(true, T('Reading aloud', '朗讀緊') + (skipped ? T(`. No Cantonese voice is installed, so ${skipped} Cantonese passages are skipped.`, `。未安裝粵語聲音，所以跳過 ${skipped} 段廣東話。`) : ''));
      segs.forEach((s, i) => {
        const u = new SpeechSynthesisUtterance(s.text); const v = voiceFor(s.lang);
        if (v) { u.voice = v; u.lang = v.lang; } else u.lang = s.lang === 'yue' ? 'zh-HK' : 'en';
        u.rate = +X.narr.rate || 1; u.pitch = +X.narr.pitch || 1;
        if (i === segs.length - 1) u.onend = () => narrBar(false);
        u.onerror = () => { if (i === segs.length - 1) narrBar(false); };
        syn.speak(u);
      });
    };
    if (voices().length) start(); else { let done = false; const go = () => { if (done) return; done = true; start(); }; try { syn.addEventListener('voiceschanged', go, { once: true }); } catch (e) { /* ignore */ } setTimeout(go, 1200); }
    return true;
  }
  function decorateReads(root) {
    for (const sec of $$('main section', root || doc)) {
      const hd = sec.querySelector(':scope > h2, :scope > .vs-head > h2, :scope > .al-head > h2, :scope > .cal-head > h2');
      if (!hd || sec.querySelector('.read-btn') || sec.classList.contains('strip')) continue;
      const b = h('button', { type: 'button', class: 'text read-btn', 'aria-label': T('Read this section aloud', '朗讀呢一段'), text: T('Read', '朗讀') });
      b.addEventListener('click', () => read(sec)); hd.insertAdjacentElement('afterend', b);
    }
  }

  // ---------- Dim sum surprise ----------
  const DISH = [
    ['蝦餃', 'Har gow', 'A translucent steamed dumpling filled with whole prawns, judged by how thin its skin can be without tearing.'],
    ['燒賣', 'Siu mai', 'An open-topped pork and shrimp dumpling, usually crowned with a dot of orange roe.'],
    ['叉燒包', 'Char siu bao', 'A fluffy steamed bun stuffed with sweet barbecued pork.'],
    ['腸粉', 'Cheung fun', 'Silky rice noodle rolls wrapped around shrimp or beef and finished with sweet soy sauce.'],
    ['糯米雞', 'Lo mai gai', 'Sticky rice with chicken, mushroom and sausage, steamed in a lotus leaf.'],
    ['蛋撻', 'Egg tart', 'A flaky pastry shell holding a smooth, lightly sweet baked egg custard.'],
    ['鳳爪', 'Fung jau', 'Chicken feet fried then simmered in a black bean and chilli sauce until tender.'],
    ['蘿蔔糕', 'Turnip cake', 'A savoury cake of grated radish, rice flour and sausage, usually pan-fried until crisp outside.'],
    ['小籠包', 'Xiao long bao', 'A small soup dumpling: bite a corner, sip the broth, then eat the rest.'],
    ['粥', 'Congee', 'Rice slowly cooked into a comforting porridge, served plain or with fish, pork or preserved egg.'],
    ['芒果布甸', 'Mango pudding', 'A chilled, creamy mango pudding often poured with evaporated milk.'],
    ['煎堆', 'Sesame ball', 'A chewy glutinous rice ball with sweet filling, rolled in sesame seeds and deep-fried until hollow and crisp.'],
    ['春卷', 'Spring roll', 'A crisp fried roll filled with vegetables or meat, best eaten while still hot.'],
    ['芋角', 'Taro dumpling', 'A fried taro shell with a savoury pork filling, crisp and lacy on the outside.'],
    ['豉汁排骨', 'Black bean spare ribs', 'Small pieces of pork rib steamed with fermented black beans and garlic.'],
    ['奶皇包', 'Custard bun', 'A soft steamed bun with a sweet, golden salted egg custard inside.'],
    ['菠蘿包', 'Pineapple bun', 'A sweet bun with a crackly sugar crust; there is no pineapple in it.'],
    ['韭菜餃', 'Chive dumpling', 'A pan-fried dumpling of garlic chives and shrimp, soft inside with a golden base.'],
    ['豆腐花', 'Sweet tofu pudding', 'Silken soybean pudding served warm with light ginger or brown sugar syrup.'],
    ['牛柏葉', 'Tripe with ginger', 'Tender beef tripe steamed with ginger and spring onion, a classic for the adventurous.'],
    ['馬拉糕', 'Malay sponge cake', 'A steamed brown sugar sponge, light, airy and slightly sticky.'],
    ['雞扎', 'Chicken in bean curd skin', 'A bean curd skin parcel of chicken, mushroom and ham, steamed in a rich sauce.'],
  ];
  let dimTimer = 0;
  function stopDim() { clearTimeout(dimTimer); const c = $('#dimsum-card'); if (c) c.remove(); }
  function dimAllowed() {
    if (X.school.on || X.aids.calm || !X.dim) return false;
    if ($('#ov') || $('#sheet') || $('.ctxmenu')) return false;
    const a = doc.activeElement; if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return false;
    if (/demo/.test(location.pathname) || $('.demo-frame.loaded')) return false;
    return true;
  }
  function showDim(force) {
    if (!force && !dimAllowed()) return false;
    const d = DISH[Math.floor(Math.random() * DISH.length)];
    stopDim();
    const close = h('button', { type: 'button', class: 'icon', 'aria-label': T('Close', '閂'), text: '×' });
    const card = h('aside', { id: 'dimsum-card', class: 'dimsum', role: 'status' }, h('div', { class: 'small' }, T('Dim sum surprise', '點心驚喜')), h('b', { class: 'dim-name', text: `${d[0]}  ${d[1]}` }), h('p', { class: 'small', text: d[2] }), close);
    close.addEventListener('click', () => card.remove());
    body.appendChild(card); setTimeout(() => card.remove(), 14000);
    return true;
  }
  function maybeDim() {
    if (store.get('sessionStorage', 'hamu-dim')) return;
    store.set('sessionStorage', 'hamu-dim', '1');
    if (Math.random() >= 0.1) return;
    dimTimer = setTimeout(() => showDim(false), 4000 + Math.random() * 6000);
  }

  // ---------- Applying everything ----------
  function applyAll() { applySchool(); applyAids(); applySchedule(); retone(); if (window.HX_APPLY_MORE) window.HX_APPLY_MORE(); decorateReads(); paintSettings(); }

  // ---------- Small UI builders ----------
  function slider(label, min, max, step, val, on, id) {
    const r = h('input', { type: 'range', min: String(min), max: String(max), step: String(step), value: String(val), 'aria-label': label });
    const n = h('input', { type: 'number', min: String(min), max: String(max), step: String(step), value: String(val), 'aria-label': label + ' (number)', class: 'num' });
    if (id) { r.id = id; n.id = id + '-n'; }
    r.addEventListener('input', () => { n.value = r.value; on(+r.value); });
    n.addEventListener('change', () => { let v = +n.value; if (isNaN(v)) v = +r.value; v = Math.max(min, Math.min(max, v)); r.value = String(v); n.value = String(v); on(v); });
    const wrap = h('label', { class: 'slide' }, h('span', { text: label }), h('span', { class: 'row tight' }, r, n));
    wrap.set = (v) => { r.value = String(v); n.value = String(v); };
    return wrap;
  }
  function sw(label, checked, on, id) {
    const i = h('input', { type: 'checkbox', class: 'switch', role: 'switch', 'aria-label': label, checked: checked ? '' : false });
    if (id) i.id = id; i.checked = !!checked; i.addEventListener('change', () => on(i.checked));
    const wrap = h('label', { class: 'check' }, i, h('span', { text: label }));
    wrap.set = (v) => { i.checked = !!v; };
    return wrap;
  }
  const ctl = (k) => $(`.xctl[data-x="${k}"]`);
  const settingPainters = [];
  function paintSettings() { for (const p of settingPainters) p(); }
  const addPaint = (f) => { settingPainters.push(f); f(); };

  // ---------- Settings page controls ----------
  function buildSettings() {
    if (A.PAGE !== 'settings' && body.getAttribute('data-page') !== 'settings') return;
    settingPainters.length = 0;
    for (const w of $$('.xctl')) w.textContent = '';
    for (const s of $$('.setting')) if ($('.xctl', s)) s.classList.add('wide');
    let c;
    if ((c = ctl('play'))) {
      const en = slider(T('English playfulness, level 1 to 5', '英文趣味程度，1 至 5 級'), 1, 5, 1, X.play.en, (v) => { X.play.en = v; save('Playfulness'); retone(); paintPlay(); });
      const yue = slider(T('Cantonese playfulness, level 1 to 5', '廣東話趣味程度，1 至 5 級'), 1, 5, 1, X.play.yue, (v) => { X.play.yue = v; save('Playfulness'); retone(); paintPlay(); });
      const sample = h('p', { class: 'note', id: 'play-sample', 'aria-live': 'polite' });
      const note = h('p', { class: 'small muted', id: 'play-note' });
      function paintPlay() {
        const l = playLevels(); const e = PFM['Saved.'];
        sample.textContent = T('Sample: ', '例子：') + e.en[l.en - 1] + ' / ' + e.yue[l.yue - 1];
        note.textContent = X.school.on ? T('School mode is on, so playfulness is held at level 1.', '學校模式開咗，所以趣味程度固定喺 1 級。') : (ruleNow && ruleNow.play ? T(`A schedule rule holds playfulness at level ${ruleNow.play} right now.`, `定時規則而家將趣味程度固定喺 ${ruleNow.play} 級。`) : T('Level 3 is the normal wording. Facts and numbers never change.', '3 級係正常用字。事實同數字永遠唔變。'));
        en.set(X.play.en); yue.set(X.play.yue);
        for (const i of $$('input', en).concat($$('input', yue))) i.disabled = X.school.on;
      }
      c.append(en, yue, sample, note); addPaint(paintPlay);
    }
    if ((c = ctl('emoji'))) { const s = sw(T('Show a small emoji in dialog titles and toasts', '喺對話框標題同提示顯示細表情符號'), X.emoji, (v) => { X.emoji = v; save('Emoji switch'); }); c.append(s, h('p', { class: 'small muted', id: 'emoji-note' })); addPaint(() => { s.set(X.emoji); $('input', s).disabled = X.school.on; $('#emoji-note').textContent = X.school.on ? T('School mode keeps emoji off.', '學校模式會令表情符號保持關閉。') : ''; }); }
    if ((c = ctl('narr'))) buildNarr(c);
    if ((c = ctl('aids'))) {
      const mk = (k, en, yue, d1, d2) => sw(T(en, yue), X.aids[k], (v) => { X.aids[k] = v; save('Reading aids'); applyAids(); }, `aid-${k}`);
      const f = mk('focus', 'Focus', '專注'); const ca = mk('calm', 'Calm', '平靜'); const r = mk('reading', 'Reading', '閱讀');
      c.append(f, h('p', { class: 'small muted', text: T('Hides the header, footer, side blocks and extras. One button shows the rest.', '隱藏標題列、頁尾、側邊區塊同額外內容。一個掣可以顯示其餘部分。') }), ca, h('p', { class: 'small muted', text: T('Stops motion, mutes tints and shows only error toasts.', '停止動態、減淡色調，只顯示錯誤提示。') }), r, h('p', { class: 'small muted', text: T('Wider line spacing and a reading ruler that follows the pointer and the keyboard focus.', '加闊行距，並有跟住滑鼠同鍵盤焦點嘅閱讀尺。') }));
      addPaint(() => { f.set(X.aids.focus); ca.set(X.aids.calm); r.set(X.aids.reading); });
    }
    if ((c = ctl('school'))) {
      const name = h('input', { type: 'text', id: 'school-name', maxlength: '40', value: X.school.name, 'aria-label': T('Neutral name', '中性名稱') });
      name.addEventListener('change', () => { X.school.name = name.value.trim().slice(0, 40) || 'Home app'; name.value = X.school.name; save('School name'); applySchool(); });
      const s = sw(T('School mode', '學校模式'), X.school.on, (v) => { X.school.on = v; save('School mode'); applyAll(); }, 'school-on');
      const restore = h('button', { type: 'button', id: 'school-restore', class: 'tonal', text: T('Restore everything', '全部還原') });
      restore.addEventListener('click', () => { X.school.on = false; save('School mode off'); applyAll(); toast(T('School mode is off. Everything is back as you had it.', '學校模式已關閉。全部返回你原本嘅設定。')); });
      c.append(s, h('label', { class: 'field' }, h('span', { text: T('Neutral name shown instead of the product name', '代替產品名稱顯示嘅中性名稱') }), name), restore, h('p', { class: 'small muted', text: T('Your own playfulness, emoji, dim sum and narration choices are kept and come back when school mode ends. Page content that mentions the product by name is not rewritten.', '你自己嘅趣味程度、表情符號、點心同朗讀選擇會保留，學校模式結束就返嚟。頁面內容入面提到產品名嘅地方唔會改寫。') }));
      addPaint(() => { s.set(X.school.on); name.value = X.school.name; });
    }
    if ((c = ctl('dimsum'))) { const s = sw(T('Allow the dim sum surprise', '允許點心驚喜'), X.dim, (v) => { X.dim = v; save('Dim sum switch'); if (!v) stopDim(); }, 'dim-on'); const t = h('button', { type: 'button', class: 'tonal', id: 'dim-test', text: T('Show one now', '即刻顯示一個') }); t.addEventListener('click', () => { if (X.school.on || X.aids.calm) { toast(T('Not shown: school mode or Calm is on.', '冇顯示：學校模式或者平靜模式開緊。')); return; } showDim(true); }); c.append(s, t, h('p', { class: 'small muted', text: T('Shown at most once per visit, about one visit in ten, and never while you are typing or in a dialog. The dishes are a built-in text list: no picture and nothing is loaded from anywhere.', '每次瀏覽最多一次，大約十次瀏覽先有一次，打字或者開咗對話框時唔會出現。點心係內置文字清單：冇圖片，亦唔會從任何地方載入。') })); addPaint(() => s.set(X.dim)); }
    if ((c = ctl('sched'))) buildSched(c);
    if ((c = ctl('hist'))) buildHist(c);
    if (window.HX_SETTINGS_MORE) window.HX_SETTINGS_MORE();
    A.applyLang(body); A.applyVocab(body);
  }
  function buildNarr(c) {
    const status = h('p', { class: 'small', id: 'narr-status', role: 'status' });
    const pick = (lg, label, key) => { const sel = h('select', { id: `narr-${lg}`, 'aria-label': label }); sel.addEventListener('change', () => { X.narr[key] = sel.value; save('Narrator voice'); }); return sel; };
    const se = pick('en', T('English voice', '英文聲音'), 've'); const sy = pick('yue', T('Cantonese voice', '廣東話聲音'), 'vy');
    const rate = slider(T('Speed', '速度'), 0.5, 2, 0.1, X.narr.rate, (v) => { X.narr.rate = v; save('Narrator speed'); }, 'narr-rate');
    const pitch = slider(T('Pitch', '音高'), 0, 2, 0.1, X.narr.pitch, (v) => { X.narr.pitch = v; save('Narrator pitch'); }, 'narr-pitch');
    const auto = sw(T('Read each page aloud when it opens', '打開頁面時自動朗讀'), X.narr.auto, (v) => { X.narr.auto = v; save('Narrator autoplay'); }, 'narr-auto');
    const go = h('button', { type: 'button', id: 'narr-read-page', class: 'filled', text: T('Read this page', '朗讀呢頁') }); go.addEventListener('click', () => read($('#main')));
    const pause = h('button', { type: 'button', text: T('Pause or resume', '暫停或繼續') }); pause.addEventListener('click', () => { if (syn) { if (syn.paused) syn.resume(); else syn.pause(); } });
    const stop = h('button', { type: 'button', text: T('Stop', '停止') }); stop.addEventListener('click', stopRead);
    function fill() {
      const all = voices();
      for (const [sel, filt, key, none] of [[se, (v) => /^en/i.test(v.lang), 've', T('Automatic English voice', '自動揀英文聲音')], [sy, isYue, 'vy', T('Automatic Cantonese voice', '自動揀廣東話聲音')]]) {
        sel.textContent = ''; sel.appendChild(h('option', { value: '', text: none }));
        for (const v of all.filter(filt)) sel.appendChild(h('option', { value: v.name, text: `${v.name} (${v.lang})` }));
        sel.value = X.narr[key];
      }
      const yueN = all.filter(isYue).length;
      status.textContent = !syn ? T('This browser has no speech synthesis.', '呢個瀏覽器冇語音合成。') : !all.length ? T('No voices were found on this device yet. If the list stays empty, install a system voice and reload.', '呢部機暫時搵唔到聲音。如果清單一直空白，請安裝系統語音再重新載入。') : T(`${all.length} voices found, ${yueN} of them Cantonese.${yueN ? '' : ' With no Cantonese voice, Cantonese text is skipped, not read in the wrong accent.'}`, `搵到 ${all.length} 個聲音，其中 ${yueN} 個係廣東話。${yueN ? '' : ' 冇廣東話聲音時會跳過廣東話文字，唔會用錯口音讀。'}`);
      if (narrStatus) status.textContent += ' ' + narrStatus;
    }
    c.append(h('label', { class: 'field' }, h('span', { text: T('English voice', '英文聲音') }), se), h('label', { class: 'field' }, h('span', { text: T('Cantonese voice', '廣東話聲音') }), sy), rate, pitch, auto, h('div', { class: 'row' }, go, pause, stop), status);
    if (syn) { try { syn.addEventListener('voiceschanged', fill); } catch (e) { /* ignore */ } }
    addPaint(() => { fill(); rate.set(X.narr.rate); pitch.set(X.narr.pitch); auto.set(X.narr.auto); $('input', auto).disabled = X.school.on; });
  }
  const DAYS = [[1, 'Mon', '一'], [2, 'Tue', '二'], [3, 'Wed', '三'], [4, 'Thu', '四'], [5, 'Fri', '五'], [6, 'Sat', '六'], [0, 'Sun', '日']];
  function buildSched(c) {
    const list = h('ul', { class: 'rules', id: 'rules-list' });
    const line = h('p', { class: 'small', id: 'sched-now', role: 'status' });
    const addB = h('button', { type: 'button', id: 'rule-add', class: 'tonal', text: T('Add a rule', '加規則') }); addB.addEventListener('click', () => editRule(null));
    function paint() {
      list.textContent = '';
      if (!X.rules.length) list.appendChild(h('li', { class: 'muted', text: T('No rules yet. Add one to switch language, colours or playfulness on a schedule.', '未有規則。加一條規則，就可以定時轉語言、顏色或者趣味程度。') }));
      X.rules.forEach((r) => {
        const days = (r.days && r.days.length ? DAYS.filter((d) => r.days.indexOf(d[0]) >= 0) : DAYS).map((d) => T(d[1], d[2])).join(' ');
        const what = [r.lang ? T('language ' + r.lang, '語言 ' + r.lang) : '', r.theme ? T('colours ' + r.theme, '顏色 ' + r.theme) : '', r.play ? T('playfulness ' + r.play, '趣味 ' + r.play) : ''].filter(Boolean).join(', ') || T('no change', '冇改動');
        const on = sw(T('On', '開'), r.on, (v) => { r.on = v; save('Schedule rule'); applySchedule(); });
        const ed = h('button', { type: 'button', class: 'text', text: T('Edit', '編輯'), 'aria-label': T('Edit rule ', '編輯規則 ') + (r.name || '') }); ed.addEventListener('click', () => editRule(r));
        const rm = h('button', { type: 'button', class: 'text', text: T('Remove', '移除'), 'aria-label': T('Remove rule ', '移除規則 ') + (r.name || '') }); rm.addEventListener('click', () => { X.rules = X.rules.filter((x) => x !== r); save('Schedule rule removed'); applySchedule(); paint(); });
        list.appendChild(h('li', { class: 'rule' }, h('div', { class: 'grow' }, h('b', { text: r.name || `${r.from} to ${r.to}` }), h('div', { class: 'small muted', text: `${r.from} to ${r.to}, ${days}: ${what}` })), on, ed, rm));
      });
      applySchedule();
    }
    function editRule(r) {
      const d = r || { id: 'r' + Date.now(), name: '', on: true, from: '22:00', to: '07:00', days: [], lang: '', theme: '', play: '' };
      const name = h('input', { type: 'text', id: 'rule-name', value: d.name, maxlength: '40', 'aria-label': T('Rule name', '規則名稱') });
      const from = h('input', { type: 'time', id: 'rule-from', value: d.from, 'aria-label': T('From', '由') }); const to = h('input', { type: 'time', id: 'rule-to', value: d.to, 'aria-label': T('To', '到') });
      const chosen = d.days.slice();
      const dayBtns = DAYS.map((x) => { const b = h('button', { type: 'button', class: 'chip', 'aria-pressed': String(chosen.indexOf(x[0]) >= 0), text: T(x[1], x[2]) }); b.addEventListener('click', () => { const i = chosen.indexOf(x[0]); if (i >= 0) chosen.splice(i, 1); else chosen.push(x[0]); b.setAttribute('aria-pressed', String(i < 0)); }); return b; });
      const sel = (id, label, opts, v) => { const s = h('select', { id, 'aria-label': label }, ...opts.map(([val, t]) => h('option', { value: val, text: t }))); s.value = v; return s; };
      const sl = sel('rule-lang', T('Language', '語言'), [['', T('Leave as it is', '唔改')], ['en', 'English'], ['yue', '廣東話'], ['both', 'English + 廣東話']], d.lang);
      const st = sel('rule-theme', T('Colours', '顏色'), [['', T('Leave as it is', '唔改')], ['system', T('System', '跟系統')], ['light', T('Light', '淺色')], ['dark', T('Dark', '深色')]], d.theme);
      const sp = sel('rule-play', T('Playfulness', '趣味程度'), [['', T('Leave as it is', '唔改')], ...[1, 2, 3, 4, 5].map((n) => [String(n), String(n)])], String(d.play || ''));
      const err = h('p', { class: 'field-err', role: 'alert' });
      const ok = h('button', { type: 'button', class: 'filled', id: 'rule-save', text: T('Save the rule', '儲存規則') });
      ok.addEventListener('click', () => {
        if (toMin(from.value) < 0 || toMin(to.value) < 0) { err.textContent = T('Choose both times.', '請揀兩個時間。'); return; }
        Object.assign(d, { name: name.value.trim(), from: from.value, to: to.value, days: chosen.slice().sort(), lang: sl.value, theme: st.value, play: sp.value });
        if (!r) X.rules.push(d); save('Schedule rule'); closeDialog(); paint();
      });
      dialog(r ? T('Edit rule', '編輯規則') : T('Add a rule', '加規則'), h('div', { class: 'stack' },
        h('label', { class: 'field' }, h('span', { text: T('Name (optional)', '名稱（可選）') }), name),
        h('div', { class: 'row' }, h('label', { class: 'field grow' }, h('span', { text: T('From', '由') }), from), h('label', { class: 'field grow' }, h('span', { text: T('To (may be after midnight)', '到（可以過咗午夜）') }), to)),
        h('div', { class: 'row', role: 'group', 'aria-label': T('Weekdays', '星期') }, ...dayBtns), h('p', { class: 'small muted', text: T('No day chosen means every day. A range that crosses midnight belongs to the day it starts on.', '冇揀日子即係每日。跨越午夜嘅時段屬於開始嗰日。') }),
        h('div', { class: 'row' }, h('label', { class: 'field grow' }, h('span', { text: T('Language', '語言') }), sl), h('label', { class: 'field grow' }, h('span', { text: T('Colours', '顏色') }), st), h('label', { class: 'field grow' }, h('span', { text: T('Playfulness', '趣味程度') }), sp)),
        err, h('div', { class: 'row' }, h('button', { type: 'button', 'data-close': '1', text: T('Cancel', '取消') }), h('span', { class: 'grow' }), ok)), { focus: '#rule-name' });
    }
    c.append(h('div', { class: 'row' }, addB), list, line); paint();
  }
  function buildHist(c) {
    const list = h('ul', { class: 'rules', id: 'hist-list' });
    const exp = h('button', { type: 'button', id: 'hist-export', text: T('Export history', '匯出紀錄') });
    exp.addEventListener('click', () => A.download('history.json', 'application/json', JSON.stringify(hist.map((e) => ({ time: new Date(e.t).toISOString(), what: e.what })), null, 2)));
    const clr = h('button', { type: 'button', id: 'hist-clear', class: 'danger', text: T('Clear history', '清除紀錄') });
    clr.addEventListener('click', () => A.superConfirm(T('Clear history', '清除紀錄'), [T('Every entry in the history list is deleted.', '紀錄清單入面所有項目都會刪除。'), T('Your current settings stay as they are.', '你而家嘅設定唔會變。')], () => { hist = []; try { localStorage.setItem(HKEY, '[]'); } catch (e) { /* ignore */ } paint(); toast(T('History cleared.', '已清除紀錄。')); }));
    function paint() {
      list.textContent = '';
      if (!hist.length) list.appendChild(h('li', { class: 'muted', text: T('No changes recorded yet. Change a setting and it will appear here.', '未有紀錄。改一個設定，就會喺度出現。') }));
      hist.slice(0, 100).forEach((e, i) => {
        const d = new Date(e.t); const when = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${clock(d)}:${pad(d.getSeconds())}`;
        const b = h('button', { type: 'button', class: 'text', 'data-restore': String(i), text: T('Restore', '還原'), 'aria-label': `${T('Restore the entry from', '還原呢項紀錄')} ${when}` }); b.addEventListener('click', () => { restoreEntry(e); toast(T('Restored.', '已還原。')); });
        list.appendChild(h('li', { class: 'rule' }, h('div', { class: 'grow' }, h('b', { text: e.what }), h('div', { class: 'small muted mono', text: when })), b));
      });
    }
    window.addEventListener('hx-hist', paint); c.append(h('div', { class: 'row' }, exp, clr), list); paint();
  }

  // ---------- Per-setting reset ----------
  doc.addEventListener('click', (e) => {
    const r = e.target.closest('[data-reset]'); if (!r) return; const k = r.dataset.reset;
    const d = defaults();
    const map = { play: () => { X.play = d.play; }, emoji: () => { X.emoji = false; }, narr: () => { X.narr = d.narr; stopRead(); }, aids: () => { X.aids = d.aids; }, school: () => { X.school = d.school; }, dimsum: () => { X.dim = true; }, sched: () => { X.rules = []; }, appear: () => { X.ap = {}; }, logo: () => { try { localStorage.removeItem('hamu-logo'); } catch (er) { /* ignore */ } }, anim: () => { X.anim = null; }, locks: () => { /* handled in part 2 */ } };
    if (!map[k]) return; if (k === 'locks') return;
    map[k](); save('Reset: ' + k, k === 'logo'); applyAll(); buildSettings(); if (window.HX_APPLY_MORE) window.HX_APPLY_MORE();
  });
  window.addEventListener('hamu-reset', () => { X = Object.assign(defaults(), { locks: X.locks }); try { localStorage.removeItem('hamu-logo'); } catch (e) { /* ignore */ } store.set('localStorage', KEY, JSON.stringify(X)); applyAll(); buildSettings(); });
  window.addEventListener('hamu-lang', () => { retone(); applySchedule(); });

  // ---------- Phone menu sheet ----------
  function openSheet() {
    closeSheet();
    const btnM = $('#menu-btn'); if (btnM) btnM.setAttribute('aria-expanded', 'true');
    const links = $$('.head-nav a').map((a) => { const c = a.cloneNode(true); c.className = 'sheet-link'; return c; });
    const mirror = (id, cls) => { const real = $(id); const b = h('button', { type: 'button', class: cls || 'tonal' }); const sync = () => { b.textContent = real.textContent; b.setAttribute('aria-label', real.getAttribute('aria-label') || ''); }; sync(); b.addEventListener('click', () => { real.click(); sync(); const c = $('#bell-n'); void c; }); return b; };
    const bellB = h('button', { type: 'button', class: 'tonal', text: T('Notifications', '通知') + ($('#bell-n') && !$('#bell-n').hidden ? ` (${$('#bell-n').textContent})` : '') }); bellB.addEventListener('click', () => { closeSheet(); A.openNotes(); });
    const searchB = h('button', { type: 'button', class: 'filled', text: T('Search everything', '搜尋全部') }); searchB.addEventListener('click', () => { closeSheet(); $('#pal-btn').click(); });
    const readB = h('button', { type: 'button', class: 'tonal', text: T('Read this page', '朗讀呢頁') }); readB.addEventListener('click', () => { closeSheet(); read($('#main')); });
    const sheet = h('div', { id: 'sheet', class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': T('Menu', '選單'), tabindex: '-1' },
      h('div', { class: 'sheet-head' }, h('b', { text: T('Menu', '選單') }), h('button', { type: 'button', class: 'icon', id: 'sheet-close', 'aria-label': T('Close the menu', '閂咗選單'), text: '×' })),
      h('nav', { class: 'sheet-nav', 'aria-label': T('Main', '主導覽') }, ...links), h('div', { class: 'sheet-btns' }, searchB, mirror('#lang-btn'), mirror('#theme-btn'), bellB, readB));
    const back = h('div', { id: 'sheet-back', class: 'sheet-back' });
    back.addEventListener('click', closeSheet);
    body.append(back, sheet);
    $('#sheet-close').addEventListener('click', closeSheet);
    sheet.addEventListener('click', (e) => { if (e.target.closest('a')) closeSheet(); });
    sheet.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); closeSheet(); return; }
      if (e.key === 'Tab') { const f = $$('a,button', sheet).filter((x) => !x.disabled && x.offsetParent !== null); if (!f.length) return; const a = f[0]; const z = f[f.length - 1]; if (e.shiftKey && doc.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && doc.activeElement === z) { e.preventDefault(); a.focus(); } }
    });
    requestAnimationFrame(() => sheet.classList.add('open')); sheet.focus(); A.applyLang(sheet);
  }
  function closeSheet() {
    const s = $('#sheet'); const b = $('#sheet-back'); if (s) s.remove(); if (b) b.remove();
    const m = $('#menu-btn'); if (m) { m.setAttribute('aria-expanded', 'false'); if (s) m.focus(); }
  }
  doc.addEventListener('click', (e) => { if (e.target.closest('#menu-btn')) openSheet(); });
  window.addEventListener('hx-closesheet', closeSheet);

  // ---------- Guided update wizard ----------
  function buildWizard() {
    const wiz = $('#wiz'); const plain = $('#plain-steps'); if (!wiz || !plain || wiz.dataset.built) return;
    wiz.dataset.built = '1';
    const steps = $$('li', plain).map((li) => ({ en: li.dataset.en !== undefined ? li.dataset.en : li.textContent, yue: li.getAttribute('data-yue') || li.textContent }));
    const build = body.getAttribute('data-build') || '0'; const SK = `hamu-wiz-${build}`;
    let state = { i: 0, done: [] }; try { const s = JSON.parse(store.get('sessionStorage', SK) || 'null'); if (s && Array.isArray(s.done)) state = s; } catch (e) { /* ignore */ }
    const sv = () => store.set('sessionStorage', SK, JSON.stringify(state));
    wiz.hidden = false; plain.hidden = true; wiz.parentNode.classList.add('js-wiz');
    function paint() {
      wiz.textContent = '';
      const n = steps.length; const last = state.i >= n;
      const pct = Math.round((Math.min(state.i, n) / n) * 100);
      wiz.appendChild(h('div', { class: 'wiz-top' }, h('b', { text: last ? T('Summary', '總結') : T(`Step ${state.i + 1} of ${n}`, `第 ${state.i + 1}/${n} 步`) }), h('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(pct), 'aria-label': T('Update steps progress', '更新步驟進度') }, h('i', { style: `width:${pct}%` }))));
      if (!last) {
        const s = steps[state.i]; const done = state.done.indexOf(state.i) >= 0;
        const t = h('p', { class: 'wiz-text', 'data-yue': s.yue, text: s.en });
        const cb = h('input', { type: 'checkbox', id: 'wiz-tick', checked: done ? '' : false, 'aria-label': T('I did this step', '我做咗呢一步') }); cb.checked = done;
        cb.addEventListener('change', () => { const k = state.done.indexOf(state.i); if (cb.checked && k < 0) state.done.push(state.i); else if (!cb.checked && k >= 0) state.done.splice(k, 1); sv(); });
        const back = h('button', { type: 'button', id: 'wiz-back', text: T('Back', '上一步'), disabled: state.i === 0 }); back.addEventListener('click', () => { state.i = Math.max(0, state.i - 1); sv(); paint(); });
        const next = h('button', { type: 'button', id: 'wiz-next', class: 'filled', text: state.i === n - 1 ? T('Finish and see the summary', '完成並睇總結') : T('Next step', '下一步') }); next.addEventListener('click', () => { state.i += 1; sv(); paint(); });
        wiz.append(h('div', { class: 'card tonal wiz-card' }, t, h('label', { class: 'check' }, cb, h('span', { text: T('I did this step', '我做咗呢一步') }))), h('div', { class: 'row' }, back, next));
      } else {
        const ul = h('ul', { class: 'plain-col' }, ...steps.map((s, k) => h('li', null, h('b', { text: state.done.indexOf(k) >= 0 ? T('Done: ', '完成：') : T('Not ticked: ', '未剔：') }), h('span', { 'data-yue': s.yue, text: s.en }))));
        const again = h('button', { type: 'button', id: 'wiz-again', text: T('Start again', '重新開始') }); again.addEventListener('click', () => { state = { i: 0, done: [] }; sv(); paint(); });
        const back = h('button', { type: 'button', text: T('Back', '上一步') }); back.addEventListener('click', () => { state.i = steps.length - 1; sv(); paint(); });
        wiz.append(h('p', { class: 'wiz-sum' }, T(`${state.done.length} of ${n} steps ticked.`, `剔咗 ${state.done.length}/${n} 步。`)), ul, h('div', { class: 'row' }, back, again));
      }
      A.applyLang(wiz); A.applyVocab(wiz);
    }
    paint(); window.addEventListener('hamu-lang', paint);
  }

  // ---------- Entry points shared with part 2 and tabs ----------
  const HX = { X: () => X, save, record, defaults, retone, applyAll, applySchedule, restoreEntry, slider, sw, ctl, addPaint, buildSettings, read, stopRead, showDim, decorateReads, buildWizard, closeSheet, setX: (v) => { X = v; }, ruleActive, history: () => hist, emojiOn, voices, pageReady() { buildWizard(); decorateReads(); retone(); buildSettings(); } };
  window.HX = HX;
  applyAll(); buildWizard(); buildSettings(); maybeDim();
  setInterval(() => applySchedule(), 60000);
  if (X.narr.auto && !X.school.on) setTimeout(() => read($('#main')), 600);
  window.dispatchEvent(new CustomEvent('hx-core-ready'));
})();
