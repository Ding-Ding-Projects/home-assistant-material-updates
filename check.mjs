// Validates content files, demo pages and the generated site. Exit code 1 when problems are found,
// unless --warn-only is given.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative, sep } from 'node:path';
import { ROOT, AREAS, loadChanges, loadContent, walk, shaEq, fileExists, asArray } from './lib.mjs';

const warnOnly = process.argv.includes('--warn-only');
const problems = [];
const add = (where, msg) => problems.push(`${where}: ${msg}`);

const data = loadChanges();
const byBuild = new Map(data.releases.map((r) => [r.build, r]));
const { map: contents, problems: parseProblems } = loadContent();
for (const p of parseProblems) problems.push(p);

// ---------- Content files ----------
for (const [build, c] of contents) {
  const where = `content/${build}.json`;
  const rel = byBuild.get(build);
  if (!rel) { add(where, 'no version with this build in data/changes.json'); continue; }
  if (c.build !== build) add(where, `"build" is ${JSON.stringify(c.build)}, expected ${build}`);
  for (const f of ['headline', 'summary', 'summary_yue']) if (typeof c[f] !== 'string' || !c[f].trim()) add(where, `"${f}" is missing or empty`);
  if (!Array.isArray(c.highlights)) add(where, '"highlights" must be a list');
  if (!Array.isArray(c.other)) add(where, '"other" must be a list');
  const used = new Map();
  const useSha = (sha, label) => {
    const hit = rel.changes.find((ch) => shaEq(ch.sha, sha));
    if (!hit) { add(where, `${label}: commit ${sha} is not in data/slices/${build}.json`); return; }
    if (used.has(hit.sha)) add(where, `commit ${hit.sha} is used twice (${used.get(hit.sha)} and ${label})`);
    else used.set(hit.sha, label);
  };
  const ids = new Set();
  asArray(c.highlights).forEach((h, i) => {
    const label = `highlight ${i + 1}${h && h.id ? ` (${h.id})` : ''}`;
    if (!h || typeof h !== 'object') { add(where, `${label} is not an object`); return; }
    if (!/^[a-z0-9-]+$/.test(h.id || '')) add(where, `${label}: "id" must be lower-case letters, digits and hyphens`);
    else if (ids.has(h.id)) add(where, `${label}: duplicate id`); else ids.add(h.id);
    for (const f of ['title', 'what', 'what_yue', 'why']) if (typeof h[f] !== 'string' || !h[f].trim()) add(where, `${label}: "${f}" is missing or empty`);
    if (!Array.isArray(h.areas) || !h.areas.length || h.areas.some((a) => !AREAS.includes(a))) add(where, `${label}: "areas" must be a non-empty list of ${AREAS.join(', ')}`);
    if (!Array.isArray(h.try) || !h.try.length) add(where, `${label}: "try" must be a non-empty list`);
    if (!Array.isArray(h.sha) || !h.sha.length) add(where, `${label}: "sha" must be a non-empty list`); else h.sha.forEach((s) => useSha(s, label));
    if (typeof h.demo !== 'string' || !h.demo) add(where, `${label}: "demo" is missing`);
    else if (!fileExists(join(ROOT, h.demo))) add(where, `${label}: demo file ${h.demo} does not exist`);
  });
  asArray(c.other).forEach((o, i) => {
    const label = `other ${i + 1}`;
    if (!o || typeof o.title !== 'string' || !o.title.trim()) add(where, `${label}: "title" is missing`);
    if (!Array.isArray(o && o.sha) || !o.sha.length) add(where, `${label}: "sha" must be a non-empty list`); else o.sha.forEach((s) => useSha(s, label));
  });
  if (Array.isArray(c.highlights) && c.highlights.length === 0 && !(typeof c.no_feature_note === 'string' && c.no_feature_note.trim())) add(where, '"no_feature_note" is required when there are no highlights');
  if (Array.isArray(c.highlights) && c.highlights.length === 0 && existsSync(join(ROOT, 'demos', String(build)))) add(where, `version has no highlights but demos/${build}/ exists`);
  for (const ch of rel.changes) if (!used.has(ch.sha)) add(where, `commit ${ch.sha} ("${ch.title.slice(0, 50)}") is not used in highlights or other`);
}

// ---------- Demo pages ----------
const demoFiles = walk(join(ROOT, 'demos')).filter((f) => f.endsWith('.html'));
const FORBIDDEN = [/http:\/\//i, /https:\/\//i, /fetch\s*\(/, /XMLHttpRequest/, /localStorage/, /import\s*\(/];
for (const f of demoFiles) {
  const where = relative(ROOT, f).split(sep).join('/');
  const t = readFileSync(f, 'utf8');
  if (!/^\s*<!doctype html>/i.test(t)) add(where, 'must start with <!doctype html>');
  const links = [...t.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
  if (links.length !== 1 || !/href="\.\.\/\.\.\/assets\/demo\.css"/.test(links[0])) add(where, 'must link exactly one outside file: ../../assets/demo.css');
  if (!/<main\s+class="demo"/.test(t)) add(where, 'missing <main class="demo"');
  if (!/data-demo-reset/.test(t)) add(where, 'missing the data-demo-reset button');
  if (!/This is a demonstration with pretend data\./.test(t)) add(where, 'missing the pretend-data line');
  for (const re of FORBIDDEN) if (re.test(t)) add(where, `contains forbidden text ${re.source}`);
  for (const m of t.matchAll(/\b(src|href)\s*=\s*["']([^"']*)["']/gi)) {
    const v = m[2];
    if (m[1].toLowerCase() === 'href' && (v === '../../assets/demo.css' || v.startsWith('#'))) continue;
    add(where, `external ${m[1]}="${v}"`);
  }
}

// ---------- Generated site ----------
const SITE = join(ROOT, '_site');
if (!existsSync(SITE)) add('_site', 'does not exist; run "node build.mjs" first');
else {
  const pages = walk(SITE).filter((f) => f.endsWith('.html') && !f.split(sep).includes('demos'));
  let links = 0;
  for (const f of pages) {
    const where = '_site/' + relative(SITE, f).split(sep).join('/');
    const t = readFileSync(f, 'utf8');
    for (const m of t.matchAll(/\b(href|src)="([^"]*)"/g)) {
      let v = m[2].replace(/&amp;/g, '&');
      if (!v || v.startsWith('#') || /^(https?:|mailto:|data:|javascript:)/i.test(v)) continue;
      if (v.startsWith('/')) { add(where, `root-absolute link ${v}`); continue; }
      links += 1;
      v = v.split('#')[0].split('?')[0];
      if (!v) continue;
      let target = resolve(dirname(f), v);
      if (!existsSync(target)) { add(where, `broken link ${m[2]}`); continue; }
      if (!fileExists(target)) target = join(target, 'index.html');
      if (!existsSync(target)) add(where, `broken link ${m[2]} (no index.html)`);
    }
  }
  console.log(`Checked ${pages.length} generated pages and ${links} internal links.`);
}

// ---------- Feature inventory ----------
{
  const { FEATURES } = await import('./features.mjs');
  const inv = join(ROOT, 'docs', 'feature-inventory.md');
  if (!existsSync(inv)) add('docs/feature-inventory.md', 'is missing; run node make-inventory.mjs');
  else {
    const lines = readFileSync(inv, 'utf8').split('\n');
    for (const f of FEATURES) {
      const row = lines.find((l) => l.startsWith('| `' + f.id + '` |'));
      if (!row) add('docs/feature-inventory.md', `no row for feature ${f.id}`);
      else if (!row.includes(`| ${f.state} (`)) add('docs/feature-inventory.md', `state of ${f.id} differs from features.mjs`);
      if (existsSync(SITE) && !existsSync(join(SITE, 'features', f.id, 'index.html'))) add(`_site/features/${f.id}`, 'no article page was generated');
    }
  }
}

console.log(`Checked ${contents.size} content files and ${demoFiles.length} demo pages.`);
if (problems.length) {
  console.log(`\n${problems.length} problem${problems.length === 1 ? '' : 's'}:`);
  for (const p of problems) console.log(` - ${p}`);
  process.exit(warnOnly ? 0 : 1);
}
console.log('No problems found.');
