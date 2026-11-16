// Shared helpers for the generator, the checker and the tests. No dependencies.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = dirname(fileURLToPath(import.meta.url));

export const AREAS = ['interface', 'core', 'supervisor', 'os', 'deploy', 'docs', 'design', 'build'];
export const AREA_LABEL = {
  interface: 'Interface',
  core: 'Core',
  supervisor: 'Supervisor',
  os: 'Operating system',
  deploy: 'Deploy Assistant',
  docs: 'Documentation',
  design: 'Design',
  build: 'Build',
};
export const AREA_YUE = { interface: '介面', core: '核心', supervisor: 'Supervisor', os: '作業系統', deploy: '部署助手', docs: '文件', design: '設計', build: '建置' };
export const REPOSITORY = 'Ding-Ding-Projects/home-assistant-material';

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function areaYue(a) {
  return AREA_YUE[a] || a;
}
export function areaLabel(a) {
  return AREA_LABEL[a] || a;
}

export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/** Parse an ISO string with offset into its written parts. The date and time are used as written. */
export function parts(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(iso || ''));
  if (!m) return null;
  return { y: +m[1], mo: +m[2], d: +m[3], h: m[4], mi: m[5], day: `${m[1]}-${m[2]}-${m[3]}` };
}
export function fmtLong(iso) {
  const p = parts(iso);
  return p ? `${p.d} ${MONTHS[p.mo - 1]} ${p.y} at ${p.h}:${p.mi}` : '';
}
export function fmtDay(iso) {
  const p = parts(iso);
  return p ? `${p.d} ${MONTHS[p.mo - 1]} ${p.y}` : '';
}
export function fmtShort(iso) {
  const p = parts(iso);
  return p ? `${p.d} ${MONTHS[p.mo - 1].slice(0, 3)}, ${p.h}:${p.mi}` : '';
}
export function dayOf(iso) {
  const p = parts(iso);
  return p ? p.day : '';
}

/** Two commit ids refer to the same commit when one is a prefix of the other. */
export function shaEq(a, b) {
  a = String(a || '').toLowerCase();
  b = String(b || '').toLowerCase();
  return a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a));
}

export function primaryArea(areas) {
  for (const a of AREAS) if ((areas || []).includes(a)) return a;
  return (areas || [])[0] || 'other';
}

export function loadChanges(root = ROOT) {
  const p = join(root, 'data', 'changes.json');
  if (!existsSync(p)) throw new Error('data/changes.json is missing. Run "node fetch-data.mjs" first.');
  const data = readJson(p);
  if (!data || !Array.isArray(data.releases)) throw new Error('data/changes.json has no releases list.');
  return data;
}

/** Content files by build number. A file that does not parse is reported in `problems`. */
export function loadContent(root = ROOT) {
  const dir = join(root, 'content');
  const map = new Map();
  const problems = [];
  if (!existsSync(dir)) return { map, problems };
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    const build = Number(f.slice(0, -5));
    try {
      const c = readJson(join(dir, f));
      if (c && typeof c === 'object') map.set(Number.isFinite(build) ? build : f, c);
    } catch (e) {
      problems.push(`content/${f}: not valid JSON (${e.message})`);
    }
  }
  return { map, problems };
}

export function fileExists(path) {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

export function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

export function asArray(v) {
  return Array.isArray(v) ? v : [];
}
export function str(v) {
  return typeof v === 'string' ? v.trim() : '';
}
