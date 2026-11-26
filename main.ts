// Emberwing Air — the hand-in program (Node 22, standard library only).
//
// The repository holds the game as plain static files under game/ and four
// real browser screenshots under screenshots/. This program hands those two
// folders in: it copies them beside this file into the grader's output
// directory and writes dossier.json there, the summary the judge reads,
// using the vendored make.fun library (vendor/makefun-game.ts, unchanged
// from the kit). Nothing here touches the network, the clock or randomness,
// so the grader's two runs write identical bytes.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Play it locally first with `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });

const shotsDir = join(repoRoot, 'screenshots');
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });
}

// The scorer's own caps (reference/gate.json in the kit): text_max_bytes is
// the only one that shapes the bytes. The rest refuse an entry the scorer
// would refuse — more than 4 screenshots, one over 256 KiB, more than 993
// files in game/, 48 MiB of game files in all, or a game path over 1000
// bytes (game/ counts beside /output's own 1000-entry cap, together with
// screenshots/ and dossier.json).
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
