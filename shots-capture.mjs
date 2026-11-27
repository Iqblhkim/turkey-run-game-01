// Capture the 4 staged screenshots for Turkey Run.
// Serves game/ locally, loads each shot in shots.json at 1280x480, waits for
// window.__shotReady, fails on any console error / page error / non-localhost
// request, saves JPEG (quality 82, lowered if needed) into screenshots/.
// Usage: node shots-capture.mjs [--port 8123]

import { spawn } from 'node:child_process';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '/home/hatch/workspace/makefun/best-game-01-tools/node_modules/playwright-core/index.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SHELL = '/home/hatch/workspace/makefun/best-game-01-tools/chrome-headless-shell/chrome-headless-shell';
const args = process.argv.slice(2);
const portIdx = args.indexOf('--port');
const PORT = portIdx >= 0 ? Number(args[portIdx + 1] || 8123) : 8123;
const shots = JSON.parse(readFileSync(join(HERE, 'shots.json'), 'utf8')).shots;

let failures = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
}

const server = spawn('node', [join(HERE, 'serve.ts'), '--port', String(PORT)], { stdio: ['ignore', 'pipe', 'pipe'] });
let serverLog = '';
server.stdout.on('data', (d) => { serverLog += d; });
server.stderr.on('data', (d) => { serverLog += d; });

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try { const res = await fetch(`http://localhost:${PORT}/`); if (res.ok) return true; } catch { /* not up */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

try {
  const up = await waitForServer();
  check('server up', up, serverLog.trim());
  if (!up) process.exit(1);
  const browser = await chromium.launch({ executablePath: SHELL, args: ['--no-sandbox'] });
  try {
    for (const shot of shots) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 480 } });
      const errors = [];
      page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });
      page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
      page.on('request', (req) => {
        const u = req.url();
        if (!u.startsWith(`http://localhost:${PORT}`) && !u.startsWith(`http://127.0.0.1:${PORT}`) && !u.startsWith('data:')) {
          errors.push(`external request: ${u}`);
        }
      });
      await page.goto(`http://localhost:${PORT}/${shot.url}`, { waitUntil: 'load' });
      let ready = false;
      try { await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 30000 }); ready = true; } catch { ready = false; }
      check(`${shot.file}: __shotReady`, ready);
      const state = ready ? await page.evaluate(() => window.__shotState) : null;
      console.log(`  state: ${JSON.stringify(state)}`);
      check(`${shot.file}: no console/page/external errors`, errors.length === 0, errors.join(' | '));
      let quality = 82;
      let path = join(HERE, 'screenshots', shot.file);
      await page.screenshot({ path, type: 'jpeg', quality });
      let size = statSync(path).size;
      while (size > 262144 && quality > 70) {
        quality -= 4;
        await page.screenshot({ path, type: 'jpeg', quality });
        size = statSync(path).size;
      }
      check(`${shot.file}: size <= 256 KiB`, size <= 262144, `${size} bytes @ quality ${quality}`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
} finally {
  server.kill();
}
console.log(failures === 0 ? 'CAPTURE OK' : `CAPTURE FAILED (${failures} failures)`);
process.exit(failures === 0 ? 0 : 1);
