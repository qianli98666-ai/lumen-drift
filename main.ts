// Lumen Drift — the hand-in program for make.fun's best-game-01 (Node 22,
// standard library only). It copies this repository's game/ and screenshots/
// into the grader's output directory and writes /output/dossier.json with the
// kit's vendored library, so the judge reads exactly the game that ships.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The program is deterministic: it copies files and hashes them, so two runs
// write the same bytes.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(sourceDir, targetDir) {
  mkdirSync(targetDir, { recursive: true });
  cpSync(sourceDir, targetDir, { recursive: true });
}

function handIn() {
  mkdirSync(outputDir, { recursive: true });
  const gameOut = join(outputDir, 'game');
  const shotsOut = join(outputDir, 'screenshots');
  rmSync(gameOut, { recursive: true, force: true });
  rmSync(shotsOut, { recursive: true, force: true });
  copyTree(join(repoRoot, 'game'), gameOut);
  if (existsSync(join(repoRoot, 'screenshots'))) {
    copyTree(join(repoRoot, 'screenshots'), shotsOut);
  } else {
    mkdirSync(shotsOut, { recursive: true });
  }
  // The gate's own caps, as the kit's reference/gate.json states them: the
  // dossier text is capped at 160 KiB, screenshots at 4 files of 256 KiB,
  // game/ at 993 files and 48 MiB. Anything over them is refused upstream,
  // so the dossier builder is told the same limits here.
  const dossier = buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  });
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
}

handIn();
