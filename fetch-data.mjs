// Downloads the public change list and writes data/changes.json plus one slice per version.
// If the download fails or the data is not valid, the existing files are kept and the exit code is 0.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, REPOSITORY } from './lib.mjs';

const URL_ = `https://raw.githubusercontent.com/${REPOSITORY}/channel/changes.json`;

function valid(d) {
  if (!d || typeof d !== 'object' || !Array.isArray(d.releases)) return 'no releases list';
  for (const r of d.releases) {
    if (!r || typeof r.build !== 'number') return 'a release has no numeric build';
    if (typeof r.date !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(r.date)) return `build ${r.build} has no valid date`;
    if (!Array.isArray(r.changes)) return `build ${r.build} has no change list`;
    for (const c of r.changes) if (!c || typeof c.sha !== 'string' || typeof c.title !== 'string' || !Array.isArray(c.areas)) return `build ${r.build} has a malformed change`;
  }
  return '';
}

try {
  const res = await fetch(URL_, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const releases = (data.releases || []).filter((r) => r && r.tag);
  const problem = valid({ ...data, releases });
  if (problem) throw new Error(`invalid data: ${problem}`);
  const out = { ...data, releases };
  mkdirSync(join(ROOT, 'data', 'slices'), { recursive: true });
  writeFileSync(join(ROOT, 'data', 'changes.json'), JSON.stringify(out, null, 1) + '\n');
  for (const r of releases) writeFileSync(join(ROOT, 'data', 'slices', `${r.build}.json`), JSON.stringify(r) + '\n');
  console.log(`Fetched ${releases.length} releases (newest build ${out.newest_build ?? releases[0]?.build}).`);
} catch (e) {
  console.warn(`Warning: the change list could not be updated (${e.message}). Keeping the existing data files.`);
}
process.exit(0);
