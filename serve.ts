// Turkey Run: Thanksgiving Escape — static server for game/ (Node 22 stdlib only).
// Usage: node serve.ts [--port 8080]  (default 8080, bind 127.0.0.1).
// Serves index.html at /, refuses any path outside game/ (403), 404 for
// missing files, no directory listing, cache-control: no-store.

import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const GAME_DIR = resolve(HERE, 'game');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const args = process.argv.slice(2);
let port = 8080;
const portIdx = args.indexOf('--port');
if (portIdx >= 0 && args[portIdx + 1]) {
  port = Number(args[portIdx + 1]);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('serve.ts: --port must be an integer 1..65535');
    process.exit(1);
  }
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/') rel = '/index.html';
  const filePath = resolve(GAME_DIR, `.${rel}`);
  if (!filePath.startsWith(GAME_DIR + '/') && filePath !== GAME_DIR) {
    res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
    res.end('403 Forbidden\n');
    return;
  }
  let stat;
  try {
    stat = statSync(filePath);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
    res.end('404 Not Found\n');
    return;
  }
  if (!stat.isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
    res.end('404 Not Found\n');
    return;
  }
  const type = MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
  res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(readFileSync(filePath));
});

server.listen(port, '127.0.0.1', () => {
  console.log(`game/ is on http://localhost:${port}`);
});
