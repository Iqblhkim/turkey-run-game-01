// End-to-end playtest probe for Turkey Run (headless).
// title -> Space starts play -> HUD values increase -> debugEnd('caught')
// renders end screen -> R restarts to title -> debugEnd('escaped') renders
// ESCAPED screen. Fails on any console/page error or non-localhost request.
// Usage: node playtest.mjs [--port 8125]

import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '/home/hatch/workspace/makefun/best-game-01-tools/node_modules/playwright-core/index.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SHELL = '/home/hatch/workspace/makefun/best-game-01-tools/chrome-headless-shell/chrome-headless-shell';
const args = process.argv.slice(2);
const portIdx = args.indexOf('--port');
const PORT = portIdx >= 0 ? Number(args[portIdx + 1] || 8125) : 8125;

let failures = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = spawn('node', [join(HERE, 'serve.ts'), '--port', String(PORT)], { stdio: ['ignore', 'pipe', 'pipe'] });
let serverLog = '';
server.stdout.on('data', (d) => { serverLog += d; });
server.stderr.on('data', (d) => { serverLog += d; });
async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try { const res = await fetch(`http://localhost:${PORT}/`); if (res.ok) return true; } catch { /* not up */ }
    await sleep(200);
  }
  return false;
}

try {
  const up = await waitForServer();
  check('server up', up, serverLog.trim());
  if (!up) process.exit(1);
  const browser = await chromium.launch({ executablePath: SHELL, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
    page.on('request', (req) => {
      const u = req.url();
      if (!u.startsWith(`http://localhost:${PORT}`) && !u.startsWith(`http://127.0.0.1:${PORT}`) && !u.startsWith('data:')) errors.push(`external request: ${u}`);
    });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
    await sleep(1000);
    const st0 = await page.evaluate(() => window.__turkeyGame.getState());
    check('title state on load', st0.state === 'title', JSON.stringify(st0));

    // Start with Space, let it run, jump a few times.
    await page.keyboard.press('Space');
    await sleep(500);
    const st1 = await page.evaluate(() => window.__turkeyGame.getState());
    check('Space starts play', st1.state === 'play', JSON.stringify(st1));
    await page.keyboard.press('Space');
    await sleep(1500);
    await page.keyboard.press('ArrowDown');
    await sleep(1000);
    const st2 = await page.evaluate(() => window.__turkeyGame.getState());
    console.log(`  after ~3s play: ${JSON.stringify(st2)}`);
    check('HUD: distance increased', st2.distance > 20, `distance=${st2.distance}`);
    check('HUD: score increased', st2.score > 0, `score=${st2.score}`);
    check('HUD: hearts intact or changed sanely', st2.hearts >= 0 && st2.hearts <= 3, `hearts=${st2.hearts}`);

    // Pause and resume.
    await page.keyboard.press('KeyP');
    await sleep(300);
    const stP = await page.evaluate(() => window.__turkeyGame.getState());
    check('P pauses', stP.state === 'pause', `state=${stP.state}`);
    await page.keyboard.press('KeyP');
    await sleep(300);
    const stR = await page.evaluate(() => window.__turkeyGame.getState());
    check('P resumes', stR.state === 'play', `state=${stR.state}`);

    // Force CAUGHT end screen, then restart with R.
    await page.evaluate(() => window.__turkeyGame.debugEnd('caught'));
    await sleep(500);
    const stC = await page.evaluate(() => window.__turkeyGame.getState());
    check('debugEnd caught -> caught state', stC.state === 'caught', JSON.stringify(stC));
    await page.keyboard.press('KeyR');
    await sleep(500);
    const stT = await page.evaluate(() => window.__turkeyGame.getState());
    check('R restarts to title', stT.state === 'title', `state=${stT.state}`);

    // Start again, force ESCAPED, restart by clicking the button.
    await page.keyboard.press('Space');
    await sleep(400);
    await page.evaluate(() => window.__turkeyGame.debugEnd('escaped'));
    await sleep(500);
    const stE = await page.evaluate(() => window.__turkeyGame.getState());
    check('debugEnd escaped -> escaped state', stE.state === 'escaped', JSON.stringify(stE));
    // Restart button is centred at (640, panelY+142+28); panelY = 0.42*720 = 302 -> y ~ 472.
    await page.mouse.click(640, 472);
    await sleep(500);
    const stT2 = await page.evaluate(() => window.__turkeyGame.getState());
    check('click RESTART -> title', stT2.state === 'title', `state=${stT2.state}`);

    check('zero console/page/external errors', errors.length === 0, errors.join(' | '));
    await page.close();
  } finally {
    await browser.close();
  }
} finally {
  server.kill();
}
console.log(failures === 0 ? 'PLAYTEST OK' : `PLAYTEST FAILED (${failures} failures)`);
process.exit(failures === 0 ? 0 : 1);
