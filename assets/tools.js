/* The Base64 toolkit and the file converter. Everything runs in this browser; nothing is uploaded and nothing is
   fetched. Loaded only on the two tool pages. */
(() => {
  'use strict';
  const A = window.HAMU; if (!A) return;
  const { T, toast, h, $, $$ } = A;
  const doc = document;
  const enc = new TextEncoder();
  const MAX_FILE = 8 * 1024 * 1024;
  const fmtSize = (n) => (n < 1024 ? `${n} bytes` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`);
  const ID = (id, r) => (r || doc).querySelector(`#${id}`);

  // ---------- Base64 maths ----------
  function toB64(bytes, urlsafe, pad) {
    let s = ''; const CH = 0x8000;
    for (let i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    let out = btoa(s);
    if (urlsafe) out = out.replace(/\+/g, '-').replace(/\//g, '_');
    if (!pad) out = out.replace(/=+$/, '');
    return out;
  }
  /** Checks Base64 text. Returns { ok, pos, ch, msg, msgYue } where pos is the 1-based position of the first bad character. */
  function validate(text) {
    const src = String(text);
    let clean = ''; const map = [];
    for (let i = 0; i < src.length; i++) { if (/\s/.test(src[i])) continue; clean += src[i]; map.push(i + 1); }
    if (!clean) return { ok: false, empty: true, msg: 'Nothing to check yet.', msgYue: '未有嘢可以檢查。' };
    const body = clean.replace(/=+$/, ''); const padLen = clean.length - body.length;
    for (let i = 0; i < body.length; i++) {
      if (!/[A-Za-z0-9+/\-_]/.test(body[i])) return { ok: false, pos: map[i], ch: body[i], msg: `Not Base64: the first bad character is "${body[i]}" at position ${map[i]}.`, msgYue: `唔係 Base64：第一個錯字係「${body[i]}」，位置 ${map[i]}。` };
    }
    if (/[+/]/.test(body) && /[-_]/.test(body)) { const i = body.search(/[-_]/); return { ok: false, pos: map[i], ch: body[i], msg: `The standard and URL-safe alphabets are mixed: "${body[i]}" at position ${map[i]}.`, msgYue: `標準同網址安全字母混用：「${body[i]}」，位置 ${map[i]}。` }; }
    if (padLen > 2) { const i = body.length + 2; return { ok: false, pos: map[Math.min(i, map.length - 1)], ch: '=', msg: `Too much = padding: at most two are allowed (position ${map[Math.min(i, map.length - 1)]}).`, msgYue: `= 補位太多：最多兩個（位置 ${map[Math.min(i, map.length - 1)]}）。` }; }
    if (body.length % 4 === 1) return { ok: false, pos: map[map.length - 1], ch: '', msg: 'The length is not valid: one stray character is left at the end.', msgYue: '長度唔啱：最後多咗一個字。' };
    if (padLen && (body.length + padLen) % 4 !== 0) return { ok: false, pos: map[map.length - 1], ch: '=', msg: 'The = padding does not make the length a multiple of 4.', msgYue: '= 補位令長度唔係 4 嘅倍數。' };
    return { ok: true, body, urlsafe: /[-_]/.test(body), bytes: Math.floor((body.length * 3) / 4), msg: 'Valid Base64.', msgYue: '有效嘅 Base64。' };
  }
  function fromB64(text) {
    const v = validate(text); if (!v.ok) throw Object.assign(new Error(v.msg), { v });
    let b = v.body.replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '=';
    const bin = atob(b); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  const verdict = (el, v) => { el.textContent = T(v.msg, v.msgYue); el.dataset.ok = String(!!v.ok); el.classList.toggle('bad', !v.ok && !v.empty); };
  const save = (name, mime, data) => { const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type: `${mime};charset=utf-8` })); const a = h('a', { href: url, download: name }); doc.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000); };
  const copy = (t) => { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(() => toast(T('Copied.', '複製咗。')), () => toast(T('Copying is not available here.', '呢度用唔到複製。'))); else toast(T('Copying is not available here.', '呢度用唔到複製。')); };

  function wireB64(r) {
    const inp = ID('b64-in', r); const out = ID('b64-out', r); const valid = ID('b64-valid', r); const size = ID('b64-size', r);
    const url = ID('b64-url', r); const pad = ID('b64-pad', r);
    const sizes = (a, b) => { size.textContent = T(`Input ${fmtSize(a)}, result ${fmtSize(b)}.`, `輸入 ${fmtSize(a)}，結果 ${fmtSize(b)}。`); };
    function live() { const t = inp.value; if (!t) { valid.textContent = ''; return; } verdict(valid, validate(t)); }
    inp.addEventListener('input', live);
    ID('b64-enc', r).addEventListener('click', () => { const bytes = enc.encode(inp.value); out.value = toB64(bytes, url.checked, pad.checked); sizes(bytes.length, out.value.length); valid.textContent = T('Encoded as UTF-8, then Base64.', '已經用 UTF-8 編碼，再轉做 Base64。'); valid.dataset.ok = 'true'; valid.classList.remove('bad'); });
    ID('b64-dec', r).addEventListener('click', () => {
      try { const bytes = fromB64(inp.value); out.value = new TextDecoder('utf-8', { fatal: true }).decode(bytes); sizes(inp.value.length, bytes.length); verdict(valid, { ok: true, msg: 'Decoded to text.', msgYue: '已解碼成文字。' }); }
      catch (e) { out.value = ''; if (e.v) verdict(valid, e.v); else verdict(valid, { ok: false, msg: 'The bytes are valid Base64 but not UTF-8 text. Use "Base64 to file" instead.', msgYue: '字節係有效 Base64，但唔係 UTF-8 文字。請改用「Base64 轉檔案」。' }); }
    });
    ID('b64-copy', r).addEventListener('click', () => copy(out.value));
    ID('b64-dl', r).addEventListener('click', () => { if (!out.value) { toast(T('Nothing to download yet.', '未有嘢可以下載。')); return; } save('result.txt', 'text/plain', out.value); });
    ID('b64-swap', r).addEventListener('click', () => { inp.value = out.value; out.value = ''; live(); });
    ID('b64-clear', r).addEventListener('click', () => { inp.value = ''; out.value = ''; valid.textContent = ''; size.textContent = ''; });
    // file to Base64
    const fOut = ID('b64-file-out', r); const fInfo = ID('b64-file-info', r);
    ID('b64-file', r).addEventListener('change', (e) => {
      const f = e.target.files[0]; if (!f) return;
      if (f.size > MAX_FILE) { fInfo.textContent = T('That file is larger than 8 MB.', '檔案超過 8 MB。'); fOut.value = ''; return; }
      const rd = new FileReader(); rd.onload = () => { const bytes = new Uint8Array(rd.result); fOut.value = toB64(bytes, url.checked, pad.checked); fInfo.textContent = T(`${f.name}: ${fmtSize(bytes.length)} became ${fmtSize(fOut.value.length)} of Base64.`, `${f.name}：${fmtSize(bytes.length)} 變成 ${fmtSize(fOut.value.length)} 嘅 Base64。`); }; rd.onerror = () => { fInfo.textContent = T('The file could not be read.', '讀唔到呢個檔案。'); }; rd.readAsArrayBuffer(f);
    });
    ID('b64-file-copy', r).addEventListener('click', () => copy(fOut.value));
    ID('b64-file-dl', r).addEventListener('click', () => { if (!fOut.value) { toast(T('Nothing to download yet.', '未有嘢可以下載。')); return; } save('file.base64.txt', 'text/plain', fOut.value); });
    // Base64 to file
    const tIn = ID('b64-tofile-in', r); const tOk = ID('b64-tofile-valid', r);
    tIn.addEventListener('input', () => { if (!tIn.value) { tOk.textContent = ''; return; } const v = validate(tIn.value); verdict(tOk, v.ok ? Object.assign({}, v, { msg: `Valid Base64, ${fmtSize(v.bytes)} when decoded.`, msgYue: `有效 Base64，解碼後 ${fmtSize(v.bytes)}。` }) : v); });
    ID('b64-tofile-dl', r).addEventListener('click', () => {
      try { const bytes = fromB64(tIn.value); const name = (ID('b64-tofile-name', r).value || 'decoded.bin').replace(/[\\/:*?"<>|]/g, '_').slice(0, 80); save(name, 'application/octet-stream', new Blob([bytes], { type: 'application/octet-stream' })); toast(T('Downloaded.', '已下載。')); }
      catch (e) { verdict(tOk, e.v || { ok: false, msg: 'That is not valid Base64.', msgYue: '呢個唔係有效 Base64。' }); }
    });
  }

  // ---------- Converter ----------
  function parseCsv(text) {
    const rows = []; let row = []; let cell = ''; let q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; continue; }
      if (c === '"') q = true; else if (c === ',') { row.push(cell); cell = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); cell = ''; if (row.length > 1 || row[0] !== '') rows.push(row); row = []; } else cell += c;
    }
    if (q) throw new Error('A quoted value is not closed.');
    row.push(cell); if (row.length > 1 || row[0] !== '') rows.push(row);
    return rows;
  }
  const csvCell = (v) => { const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v); return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const LIMITS = {
    image: ['Images are re-drawn on a canvas in your browser. JPEG has no transparency, so transparent areas turn white. Animation is lost. Metadata such as camera details is dropped. WebP output depends on your browser, and the tool says so if it cannot write it.', '圖片喺你嘅瀏覽器畫布重畫。JPEG 冇透明度，透明位置會變白色。動畫會冇咗。相機資料等元數據會被丟棄。WebP 輸出視乎你嘅瀏覽器，寫唔到會講明。'],
    text64: ['Text is read and written as UTF-8. Decoding fails when the bytes are not valid UTF-8 text.', '文字用 UTF-8 讀寫。如果字節唔係有效 UTF-8 文字，解碼會失敗。'],
    j2c: ['Needs a JSON list of objects. Nested values are written as JSON text inside one cell. Column order follows first appearance.', '需要物件嘅 JSON 清單。巢狀數值會以 JSON 文字寫入一個儲存格。欄次序跟第一次出現。'],
    c2j: ['The first row is the header. Every value becomes text: numbers and true or false are not guessed. Quoted values and line breaks inside quotes are understood.', '第一行係標題。所有數值都變文字：唔會估數字同真假。明白引號入面嘅值同換行。'],
    jfmt: ['Checks the JSON, then rewrites its layout. Key order is kept. Very large numbers lose precision, as in any browser.', '檢查 JSON，再重排版面。鍵嘅次序會保留。好大嘅數字會失去精確度，所有瀏覽器都一樣。'],
  };
  function wireConvert(r) {
    const mode = ID('cv-mode', r); const limit = ID('cv-limit', r); const msg = ID('cv-msg', r);
    let textResult = ''; let blobResult = null; let blobName = 'converted';
    const showMode = () => { for (const s of $$('[data-mode]', r)) s.hidden = s.dataset.mode !== mode.value; const l = LIMITS[mode.value]; limit.textContent = ''; limit.appendChild(h('strong', { text: T('Limits: ', '限制：') })); limit.appendChild(doc.createTextNode(T(l[0], l[1]))); msg.textContent = ''; textResult = ''; blobResult = null; };
    mode.addEventListener('change', showMode); showMode(); window.addEventListener('hamu-lang', () => { if (!r.isConnected) return; const l = LIMITS[mode.value]; limit.textContent = ''; limit.appendChild(h('strong', { text: T('Limits: ', '限制：') })); limit.appendChild(doc.createTextNode(T(l[0], l[1]))); });
    const say = (en, yue, bad) => { msg.textContent = T(en, yue); msg.classList.toggle('bad', !!bad); };
    // image
    const qR = ID('cv-img-q', r); qR.addEventListener('input', () => { ID('cv-q-out', r).textContent = qR.value; });
    ID('cv-img-go', r).addEventListener('click', async () => {
      const f = ID('cv-img-file', r).files[0]; const info = ID('cv-img-info', r); const prev = ID('cv-img-prev', r);
      if (!f) { info.textContent = T('Choose an image first.', '請先揀一張圖片。'); return; }
      if (f.size > MAX_FILE) { info.textContent = T('That image is larger than 8 MB.', '圖片超過 8 MB。'); return; }
      if (['image/png', 'image/jpeg', 'image/webp'].indexOf(f.type) < 0) { info.textContent = T('Only PNG, JPEG and WebP are accepted.', '只接受 PNG、JPEG 同 WebP。'); return; }
      const want = ID('cv-img-fmt', r).value; const url = URL.createObjectURL(f); const img = new Image();
      img.onload = () => {
        const cv = doc.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight; const g = cv.getContext('2d');
        if (want === 'image/jpeg') { g.fillStyle = '#ffffff'; g.fillRect(0, 0, cv.width, cv.height); }
        g.drawImage(img, 0, 0); URL.revokeObjectURL(url);
        cv.toBlob((b) => {
          if (!b) { info.textContent = T('The conversion failed in this browser.', '呢個瀏覽器轉換失敗。'); return; }
          blobResult = b; const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[b.type] || 'png'; blobName = `converted.${ext}`; textResult = '';
          const note = b.type !== want ? T(` This browser could not write ${want}, so it wrote ${b.type} instead.`, ` 呢個瀏覽器寫唔到 ${want}，所以改寫 ${b.type}。`) : '';
          info.textContent = T(`${f.type} ${fmtSize(f.size)} became ${b.type} ${fmtSize(b.size)}, ${cv.width} by ${cv.height} pixels.${note}`, `${f.type} ${fmtSize(f.size)} 變成 ${b.type} ${fmtSize(b.size)}，${cv.width} × ${cv.height} 像素。${note}`);
          prev.textContent = ''; prev.appendChild(h('img', { src: URL.createObjectURL(b), alt: T('Converted image preview', '轉換後圖片預覽'), class: 'cv-img' }));
        }, want, +qR.value);
      };
      img.onerror = () => { URL.revokeObjectURL(url); info.textContent = T('That image could not be read.', '讀唔到呢張圖片。'); };
      img.src = url;
    });
    // text and Base64
    const tIn = ID('cv-t-in', r); const tOut = ID('cv-t-out', r);
    ID('cv-t-enc', r).addEventListener('click', () => { tOut.value = toB64(enc.encode(tIn.value), false, true); textResult = tOut.value; blobResult = null; say('Encoded.', '已編碼。'); });
    ID('cv-t-dec', r).addEventListener('click', () => { try { tOut.value = new TextDecoder('utf-8', { fatal: true }).decode(fromB64(tIn.value)); textResult = tOut.value; blobResult = null; say('Decoded.', '已解碼。'); } catch (e) { tOut.value = ''; say(e.v ? e.v.msg : 'The bytes are not UTF-8 text.', e.v ? e.v.msgYue : '字節唔係 UTF-8 文字。', true); } });
    // JSON to CSV
    ID('cv-j-go', r).addEventListener('click', () => {
      let data; try { data = JSON.parse(ID('cv-j-in', r).value); } catch (e) { say(`The JSON is not valid: ${e.message}`, `JSON 唔有效：${e.message}`, true); return; }
      if (!Array.isArray(data) || !data.length || data.some((x) => !x || typeof x !== 'object' || Array.isArray(x))) { say('This needs a JSON list of objects, such as [{"a":1}].', '需要物件嘅 JSON 清單，例如 [{"a":1}]。', true); return; }
      const cols = []; for (const o of data) for (const k of Object.keys(o)) if (cols.indexOf(k) < 0) cols.push(k);
      const out = [cols.map(csvCell).join(',')].concat(data.map((o) => cols.map((k) => csvCell(o[k])).join(','))).join('\r\n') + '\r\n';
      ID('cv-j-out', r).value = out; textResult = out; blobResult = null; say(`Converted ${data.length} objects into ${cols.length} columns.`, `已將 ${data.length} 個物件轉成 ${cols.length} 欄。`);
    });
    // CSV to JSON
    ID('cv-c-go', r).addEventListener('click', () => {
      let rows; try { rows = parseCsv(ID('cv-c-in', r).value); } catch (e) { say(e.message, '有引號冇閂。', true); return; }
      if (rows.length < 2) { say('Add a header row and at least one data row.', '請加標題行同至少一行資料。', true); return; }
      const head = rows[0].map((x) => x.trim()); const objs = rows.slice(1).map((row) => Object.fromEntries(head.map((k, i) => [k, row[i] == null ? '' : row[i]])));
      const out = JSON.stringify(objs, null, 2); ID('cv-c-out', r).value = out; textResult = out; blobResult = null; say(`Converted ${objs.length} rows.`, `已轉換 ${objs.length} 行。`);
    });
    // JSON format
    const jf = (min) => { let d; try { d = JSON.parse(ID('cv-f-in', r).value); } catch (e) { say(`The JSON is not valid: ${e.message}`, `JSON 唔有效：${e.message}`, true); return; } const ind = ID('cv-f-ind', r).value; const out = min ? JSON.stringify(d) : JSON.stringify(d, null, ind === 'tab' ? '\t' : +ind); ID('cv-f-out', r).value = out; textResult = out; blobResult = null; say(min ? `Minified to ${out.length} characters.` : 'Pretty-printed.', min ? `已壓縮成 ${out.length} 個字元。` : '已排版。'); };
    ID('cv-f-pretty', r).addEventListener('click', () => jf(false)); ID('cv-f-min', r).addEventListener('click', () => jf(true));
    ID('cv-copy', r).addEventListener('click', () => { if (!textResult) { toast(T('There is no text result to copy.', '冇文字結果可以複製。')); return; } copy(textResult); });
    ID('cv-dl', r).addEventListener('click', () => { if (blobResult) { save(blobName, blobResult.type, blobResult); return; } if (!textResult) { toast(T('Nothing to download yet.', '未有嘢可以下載。')); return; } const ext = { j2c: 'csv', c2j: 'json', jfmt: 'json', text64: 'txt' }[mode.value] || 'txt'; save(`converted.${ext}`, ext === 'csv' ? 'text/csv' : ext === 'json' ? 'application/json' : 'text/plain', textResult); });
  }

  function init(page, root) {
    const r = root || doc.getElementById('main'); if (!r || r.dataset.wired) return;
    if (page === 'tool-base64') { r.dataset.wired = '1'; wireB64(r); } else if (page === 'tool-convert') { r.dataset.wired = '1'; wireConvert(r); }
  }
  window.HTOOLS = { init, toB64, fromB64, validate, parseCsv };
  init(doc.body.getAttribute('data-page'), doc.getElementById('main'));
})();
