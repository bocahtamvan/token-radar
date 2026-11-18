// Token Radar: a token-radar-01 entry in plain Node 22, standard library only.
//
// The run is four steps. First it reads the sealed snapshot (758 DefiLlama protocols
// as of 2026-11-14, 40 of them on the watchlist) from /input/snapshot.json, or from
// the file or directory --input names. Then lib/model.ts scores every pre-token
// protocol with the radar-2 model and builds the ranked board. Then the program
// writes the board to /output/board.json, the dashboard's data to /output/data.js,
// and copies this repository's dashboard/ and screenshots/ into /output. Finally
// it writes /output/dossier.json with the vendored make.fun library, which is the
// summary the judge reads.
//
// The dashboard itself is a static page: index.html, app.css and app.js read the
// data.js this program writes, so the page and the board can never disagree. No
// framework, no network, no hand-picked names: every row comes from the snapshot.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { boardIssue, buildRadar, dataScript, parseSnapshot } from './lib/model.ts';
import { buildDossier } from './vendor/makefun-board.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));

// The scorer's own caps, from the kit's reference/gate.json. The text cap shapes
// how much dashboard source the dossier may carry; the rest refuse outright.
const DOSSIER_TEXT_MAX_BYTES = 65_536;
const SHOT_LIMITS = { max: 4, max_bytes: 524_288 };
const SHOT_NAME = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/;

/** Read `--name <value>` or `--name=<value>` from the arguments, or use `fallback`. */
function flag(name: string, fallback: string): string {
  const argv = process.argv;
  const at = argv.indexOf(`--${name}`);
  if (at >= 0 && at + 1 < argv.length) return argv[at + 1]!;
  const joined = argv.find((a) => a.startsWith(`--${name}=`));
  return joined === undefined ? fallback : joined.slice(name.length + 3);
}

/** The snapshot file behind `--input <snapshot.json | directory>`, defaulting to /input. */
function snapshotPath(): string {
  const given = flag('input', '/input');
  return given.endsWith('.json') ? given : join(given, 'snapshot.json');
}

/** Copy every regular file in `from` into `to`, skipping dotfiles, and name what it copied. */
function copyDir(from: string, to: string): string[] {
  if (!existsSync(from)) return [];
  mkdirSync(to, { recursive: true });
  const copied: string[] = [];
  for (const name of readdirSync(from)) {
    if (name.startsWith('.')) continue;
    const source = join(from, name);
    if (!statSync(source).isFile()) continue;
    copyFileSync(source, join(to, name));
    copied.push(name);
  }
  return copied;
}

/** Fail with a message on stderr and an exit code, the way a bad run should end. */
function fail(message: string, code: number): never {
  process.stderr.write(`token radar: ${message}\n`);
  process.exit(code);
}

const inputFile = snapshotPath();
if (!existsSync(inputFile)) {
  fail(`no snapshot at ${inputFile}: pass --input <snapshot.json|directory> or mount the sealed /input`, 2);
}
const outDir = flag('output', process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

const snapshot = parseSnapshot(readFileSync(inputFile, 'utf8'));
const { board, radar } = buildRadar(snapshot);
const issue = boardIssue(board, snapshot);
if (issue !== null) fail(`the model wrote a board the gate refuses: ${issue}`, 1);

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'board.json'), `${JSON.stringify({ rows: board })}\n`);
writeFileSync(join(outDir, 'data.js'), dataScript(radar));

copyDir(join(repoRoot, 'dashboard'), join(outDir, 'dashboard'));
const shots = copyDir(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'));
if (shots.length < 3) {
  fail(`screenshots/ holds ${shots.length} image${shots.length === 1 ? '' : 's'}: hand in 3, the board, a detail view and a filtered view`, 1);
}
for (const name of shots) {
  if (!SHOT_NAME.test(name)) {
    fail(`screenshots/${name}: a name is letters, digits and . _ -, 1 to 128 characters`, 1);
  }
}

// The dossier goes last: the scorer rebuilds it from this /output and compares bytes.
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, { text_max_bytes: DOSSIER_TEXT_MAX_BYTES, screenshots: SHOT_LIMITS, dashboard: { max_files: 400, max_bytes: 4_194_304 } }),
);

process.stdout.write(
  `token radar: ${snapshot.protocols.length} protocols, ${snapshot.watchlist.length} on the watchlist, ${board.length} rows scored (${radar.early_size} early, ${radar.live_size} live set aside)\n` +
    `token radar: wrote ${join(outDir, 'board.json')}, ${join(outDir, 'data.js')}, ${join(outDir, 'dashboard')} (3 files), ${join(outDir, 'screenshots')} (${shots.length} images) and ${join(outDir, 'dossier.json')}\n`,
);
