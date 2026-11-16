// Tiny static server for _site on 127.0.0.1. Usage: node serve.mjs [port]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { ROOT } from './lib.mjs';

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8' };

export function makeServer(dir) {
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      let p = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
      if (p.includes('..')) { res.writeHead(400); res.end('bad path'); return; }
      let file = join(dir, p);
      const s = await stat(file).catch(() => null);
      if (s && s.isDirectory()) file = join(file, 'index.html');
      const data = await readFile(file);
      res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
      res.end(data);
    } catch {
      let body = 'Not found';
      try { body = await readFile(join(dir, '404.html')); } catch { /* none */ }
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(body);
    }
  });
}

if (process.argv[1] && process.argv[1].endsWith('serve.mjs')) {
  const port = Number(process.argv[2]) || 8080;
  makeServer(join(ROOT, '_site')).listen(port, '127.0.0.1', () => console.log(`Serving _site at http://127.0.0.1:${port}/`));
}
