// Writes docs/feature-inventory.md from the hand-maintained list in features.mjs. Run: node make-inventory.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib.mjs';
import { FEATURES, STATE_LABEL, PAGES_OF } from './features.mjs';

const counts = {};
for (const f of FEATURES) counts[f.state] = (counts[f.state] || 0) + 1;
const cell = (t) => String(t).replace(/\|/g, '\\|').replace(/\n/g, ' ');

const lines = [];
lines.push('# Feature inventory', '');
lines.push('Every feature the owner requires of this site, one row per feature id, with an honest state. The list lives in `features.mjs`; this file is written from it by `node make-inventory.mjs`, and `node check.mjs` fails when the two disagree.', '');
lines.push('States:', '');
lines.push('- **built**: written and exercised by `node test-demos.mjs` in a real browser. The check names what it covered.');
lines.push('- **partly**: part exists and was run; the missing part is stated.');
lines.push('- **none**: not built in this pass.');
lines.push('- **na**: cannot apply, with the specific reason.', '');
lines.push(`Totals: ${counts.built || 0} built, ${counts.partly || 0} partly, ${counts.none || 0} not built, ${counts.na || 0} not applicable, out of ${FEATURES.length}.`, '');
lines.push('Pages: home (index.html), version (releases/N/), compare, features (and its articles), settings.', '');
let group = '';
for (const f of FEATURES) {
  if (f.group !== group) {
    group = f.group;
    lines.push('', `## ${group}`, '', '| id | Feature | State | Pages | Where it is, or what is missing |', '| --- | --- | --- | --- | --- |');
  }
  lines.push(`| \`${f.id}\` | ${cell(f.name)} | ${cell(f.state)} (${cell(STATE_LABEL[f.state])}) | ${cell(f.state === 'none' || f.state === 'na' ? '-' : PAGES_OF[f.id] || 'see where')} | ${cell(f.where)} |`);
}
lines.push('', '## What was not run', '');
lines.push('- The 125, 150 and 200 percent display-scale matrix and per-element clipping measurement.');
lines.push('- Screen reader testing. Keyboard operation was exercised for the calendar, the chart, the palette, the dialogs and the tabs.');
lines.push('- The deployed site: nothing was published or opened from the hosting address.');
lines.push('- The "Update coming soon" strip against the real GitHub API; the test answers its two addresses with pretend data.', '');
mkdirSync(join(ROOT, 'docs'), { recursive: true });
writeFileSync(join(ROOT, 'docs', 'feature-inventory.md'), lines.join('\n'));
console.log(`Wrote docs/feature-inventory.md (${FEATURES.length} features).`);
