// Turkey Run: Thanksgiving Escape — entry program (Node 22 stdlib only).
// Copies game/ and screenshots/ from beside this file into
// $MAKEFUN_OUTPUT_DIR (default /output), then writes dossier.json there
// with buildDossier from ./vendor/makefun-game.ts. Deterministic, offline.
//
// Pre-flight validation runs BEFORE any copying: screenshots (max 4 files,
// each at most 256 KiB), game/ (max 993 entries, max 48 MiB, no path over
// 1000 bytes). A determinism self-check then builds the dossier twice into
// two temp dirs and fails loudly if the bytes differ.

import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUTPUT = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function fail(message: string): never {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

function walkFiles(dir: string, rel = ''): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(dir, rel), { withFileTypes: true })) {
    const child = rel === '' ? entry.name : `${rel}/${entry.name}`;
    if (entry.isDirectory()) out.push(...walkFiles(dir, child));
    else if (entry.isFile()) out.push(child);
    else fail(`game/${child}: not a plain file`);
  }
  return out;
}

function preflight(): void {
  const shotsDir = join(HERE, 'screenshots');
  if (!existsSync(shotsDir) || !statSync(shotsDir).isDirectory()) fail('screenshots/: missing directory');
  const shots = readdirSync(shotsDir).filter((name) => !name.startsWith('.'));
  if (shots.length === 0) fail('screenshots/: no screenshots');
  if (shots.length > CAPS.screenshots.max) {
    fail(`screenshots/: ${shots.length} files, over the ${CAPS.screenshots.max} allowed`);
  }
  for (const name of shots) {
    const size = statSync(join(shotsDir, name)).size;
    if (size > CAPS.screenshots.max_bytes) {
      fail(`screenshots/${name}: ${size} bytes, over the ${CAPS.screenshots.max_bytes} allowed`);
    }
  }
  const gameDir = join(HERE, 'game');
  if (!existsSync(gameDir) || !statSync(gameDir).isDirectory()) fail('game/: missing directory');
  const files = walkFiles(gameDir);
  // Count files + directories the way the platform does: every entry under game/.
  let entries = files.length;
  const countDirs = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        entries += 1;
        countDirs(join(dir, entry.name));
      }
    }
  };
  countDirs(gameDir);
  if (entries > CAPS.game_max_files) {
    fail(`game/: ${entries} entries, over the ${CAPS.game_max_files} allowed`);
  }
  let total = 0;
  for (const rel of files) {
    if (Buffer.byteLength(rel, 'utf8') > CAPS.game_path_max_bytes) {
      fail(`game/${rel}: path over ${CAPS.game_path_max_bytes} bytes`);
    }
    total += statSync(join(gameDir, rel)).size;
  }
  if (total > CAPS.game_max_bytes) {
    fail(`game/: ${total} bytes, over the ${CAPS.game_max_bytes} allowed`);
  }
}

function copyEntry(dest: string): void {
  mkdirSync(dest, { recursive: true });
  cpSync(join(HERE, 'game'), join(dest, 'game'), { recursive: true });
  cpSync(join(HERE, 'screenshots'), join(dest, 'screenshots'), { recursive: true });
}

function buildInto(dest: string): Uint8Array {
  copyEntry(dest);
  return buildDossier(dest, CAPS);
}

preflight();

// Determinism self-check: build the dossier twice into two temp dirs.
const tmpA = mkdtempSync(join(tmpdir(), 'turkey-run-a-'));
const tmpB = mkdtempSync(join(tmpdir(), 'turkey-run-b-'));
let dossierA: Uint8Array;
let dossierB: Uint8Array;
try {
  dossierA = buildInto(tmpA);
  dossierB = buildInto(tmpB);
} finally {
  rmSync(tmpA, { recursive: true, force: true });
  rmSync(tmpB, { recursive: true, force: true });
}
if (Buffer.compare(Buffer.from(dossierA!), Buffer.from(dossierB!)) !== 0) {
  fail('determinism self-check failed: two dossier builds differ');
}

mkdirSync(OUTPUT, { recursive: true });
copyEntry(OUTPUT);
writeFileSync(join(OUTPUT, 'dossier.json'), dossierA!);
console.log(`main.ts: wrote ${join(OUTPUT, 'dossier.json')} (${dossierA!.length} bytes)`);
