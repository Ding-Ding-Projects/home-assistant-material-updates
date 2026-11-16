// Regenerates assets/social-preview.png (1200 x 630) from a small page drawn with the site colours.
// Needs Playwright, found the same way as in test-demos.mjs. Run: node make-preview.mjs
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { ROOT } from './lib.mjs';

const FRONTEND = 'C:\\Users\\cntow\\Documents\\GitHub\\home-assistant-material\\frontend';
function findPlaywright() {
  for (const base of [import.meta.url, join(FRONTEND, 'package.json')]) {
    const req = createRequire(base);
    for (const n of ['playwright', '@playwright/test', 'playwright-core']) { try { const m = req(n); if (m.chromium) return m; } catch { /* next */ } }
  }
  try { const m = createRequire(join(FRONTEND, 'node_modules', '.pnpm', 'playwright-core@1.64.1', 'node_modules', 'playwright-core', 'package.json'))('playwright-core'); if (m.chromium) return m; } catch { /* none */ }
  return null;
}
const pw = findPlaywright();
if (!pw) { console.log('Playwright not found; the preview image was not regenerated.'); process.exit(0); }

const page = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;width:1200px;height:630px;background:#cee5ff;font-family:system-ui,"Segoe UI",Roboto,sans-serif;color:#004a76;display:grid;grid-template-columns:1fr 330px;gap:24px;padding:48px;box-sizing:border-box}
h1{font-size:112px;line-height:.95;font-weight:800;letter-spacing:-.04em;margin:0}
p{font-size:30px;margin:20px 0 0;max-width:640px}
.l{display:flex;flex-direction:column;justify-content:space-between}
.k{font-size:24px;font-weight:600}
.r{display:flex;flex-direction:column;gap:16px}
.b{border-radius:48px;padding:22px 30px;display:flex;flex-direction:column}
.b b{font-size:104px;line-height:1;font-weight:800;letter-spacing:-.04em}.b span{font-size:24px;font-weight:500}
.b1{background:#00639b;color:#fff}.b2{background:#fff;color:#181c20}.b3{background:#d5e4f6;color:#3a4857}
</style><div class="l"><div class="k">Home Assistant Material</div><div><h1>Every update, explained</h1><p>Plain-language release notes, a calendar, a search, and a working demo of every new feature.</p></div></div>
<div class="r"><div class="b b1"><b>29</b><span>versions</span></div><div class="b b2"><b>430</b><span>changes</span></div><div class="b b3"><b>68</b><span>working demos</span></div></div>`;

const browser = await pw.chromium.launch({ headless: true });
const p = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await p.setContent(page);
await p.screenshot({ path: join(ROOT, 'assets', 'social-preview.png') });
await browser.close();
console.log('Wrote assets/social-preview.png');
