// Verify Turkey Run screenshots without touching screenshots/.
// Re-loads each shot in shots.json into a TEMP dir, checks __shotReady /
// __shotState, zero console/page errors, no non-localhost requests, and
// loads the plain game (no ?shot=) confirming the title screen renders with
// zero errors. Usage: node shots-verify.mjs [--port 8124] [--out <temp dir>]

import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '/home/hatch/workspace/makefun/best-game-01-tools/node_modules/playwright-core/index.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SHELL = '/home/hatch/workspace/makefun/best-game-01-tools/chrome-headless-shell/chrome-headless-shell';
const args = process.argv.slice(2);
const portIdx = args.indexOf('--port');
const PORT = portIdx >= 0 ? Number(args[portIdx + 1] || 8124) : 8124;
const outIdx = args.indexOf('--out');
const OUT = outIdx >= 0 ? args[outIdx + 1] : mkdtempSync(join(tmpdir(), 'turkey-run-shots-'));
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
        if (!u.startsWith(`http://localhost:${PORT}`) && !u.startsWith(`http://127.0.0.1:${PORT}`) && !u.startsWith('data:')) errors.push(`external request: ${u}`);
      });
      await page.goto(`http://localhost:${PORT}/${shot.url}`, { waitUntil: 'load' });
      let ready = false;
      try { await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 30000 }); ready = true; } catch { ready = false; }
      check(`${shot.file}: __shotReady`, ready);
      const state = ready ? await page.evaluate(() => window.__shotState) : null;
      console.log(`  state: ${JSON.stringify(state)}`);
      check(`${shot.file}: no errors`, errors.length === 0, errors.join(' | '));
      if (ready) await page.screenshot({ path: join(OUT, shot.file), type: 'jpeg', quality: 82 });
      await page.close();
    }
    // Plain game: title screen, zero errors.
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    const st = await page.evaluate(() => window.__turkeyGame ? window.__turkeyGame.getState() : null);
    console.log(`  plain game state: ${JSON.stringify(st)}`);
    check('plain game: title state', st && st.state === 'title', `state=${st && st.state}`);
    check('plain game: no errors', errors.length === 0, errors.join(' | '));
    await page.close();
  } finally {
    await browser.close();
  }
  console.log(`temp screenshots in ${OUT}`);
} finally {
  server.kill();
}
console.log(failures === 0 ? 'VERIFY OK' : `VERIFY FAILED (${failures} failures)`);
process.exit(failures === 0 ? 0 : 1);
