// Downloads the public change list and merges it into data/changes.json plus one slice per version.
// Releases already stored are kept when they roll off the public list.
// If the download fails or the data is not valid, the existing files are kept and the exit code is 0.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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
  const fetched = (data.releases || []).filter((r) => r && r.tag);
  const problem = valid({ ...data, releases: fetched });
  if (problem) throw new Error(`invalid data: ${problem}`);
  // The public list only carries the most recent releases, so older ones roll off it.
  // A version that has been published here must never disappear: keep every release
  // already on disk, and never replace a stored release with a shorter copy of itself.
  const byBuild = new Map();
  const existingPath = join(ROOT, 'data', 'changes.json');
  if (existsSync(existingPath)) {
    try {
      const existing = JSON.parse(readFileSync(existingPath, 'utf8'));
      if (!valid(existing)) for (const r of existing.releases) byBuild.set(r.build, r);
    } catch {
      // An unreadable stored file is replaced by the fetched list below.
    }
  }
  for (const r of fetched) {
    const stored = byBuild.get(r.build);
    if (!stored || r.changes.length > stored.changes.length) byBuild.set(r.build, r);
  }
  const releases = [...byBuild.values()].sort((x, y) => y.build - x.build);
  const out = { ...data, releases };
  mkdirSync(join(ROOT, 'data', 'slices'), { recursive: true });
  writeFileSync(join(ROOT, 'data', 'changes.json'), JSON.stringify(out, null, 1) + '\n');
  for (const r of releases) writeFileSync(join(ROOT, 'data', 'slices', `${r.build}.json`), JSON.stringify(r) + '\n');
  console.log(`Fetched ${releases.length} releases (newest build ${out.newest_build ?? releases[0]?.build}).`);
} catch (e) {
  console.warn(`Warning: the change list could not be updated (${e.message}). Keeping the existing data files.`);
}
process.exit(0);
