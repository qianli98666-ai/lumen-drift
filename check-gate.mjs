// Local replica of the sealed gate's checkable rows for Lumen Drift (the
// server's scorer is not in the kit, so this is the closest local verdict).
// It verifies: game_files caps, no network references in index.html and the
// reachable scripts, screenshot count/size/dimensions, dossier byte-equality
// with a fresh buildDossier run, and determinism of main.ts across two runs.
//
//   node check-gate.mjs <out-dir-1> <out-dir-2>
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

const [out1, out2] = process.argv.slice(2);
if (!out1 || !out2) {
  console.error('usage: node check-gate.mjs <out-dir-1> <out-dir-2>');
  process.exit(2);
}

let failures = 0;
let passes = 0;
function check(name, ok, detail = '') {
  if (ok) {
    passes += 1;
    console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    failures += 1;
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function walk(dir, base = '') {
  const entries = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${name.name}` : name.name;
    const full = join(dir, name.name);
    if (name.isDirectory()) entries.push(...walk(full, rel));
    else if (name.isFile()) entries.push({ rel, full });
    else entries.push({ rel, full, special: true });
  }
  return entries;
}

// 1. game_files: plain files only, <=993 entries, <=48 MiB, index.html <=1 MiB.
const gameDir = join(out1, 'game');
const gameFiles = walk(gameDir);
const gameBytes = gameFiles.reduce((sum, f) => sum + statSync(f.full).size, 0);
check('game_files: no symlinks/special files', gameFiles.every((f) => !f.special));
check('game_files: <=993 entries', gameFiles.length <= 993, `${gameFiles.length} files`);
check('game_files: <=48 MiB', gameBytes <= 48 * 1024 * 1024, `${gameBytes} bytes`);
check('game_files: index.html <=1 MiB', statSync(join(gameDir, 'index.html')).size <= 1024 * 1024);
check('game_files: paths <=1000 bytes', gameFiles.every((f) => Buffer.byteLength(`game/${f.rel}`) <= 1000));

// 2. references: no http(s), protocol-relative or bare specifiers outside the
// game; every relative reference names a file inside game/.
const html = readFileSync(join(gameDir, 'index.html'), 'utf8');
const refs = [
  ...html.matchAll(/(?:src|href)\s*=\s*"([^"]+)"/g),
].map((m) => m[1]);
const scripts = gameFiles.filter((f) => f.rel.endsWith('.js') || f.rel.endsWith('.mjs'));
const importSpecifiers = [];
for (const f of scripts) {
  const text = readFileSync(f.full, 'utf8');
  for (const m of text.matchAll(/from\s+['"]([^'"]+)['"]/g)) importSpecifiers.push({ file: f.rel, spec: m[1] });
  for (const m of text.matchAll(/import\(\s*['"]([^'"]+)['"]/g)) importSpecifiers.push({ file: f.rel, spec: m[1] });
}
const badRefs = refs.filter((r) => /^(https?:|\/\/|data:)/.test(r) && !r.startsWith('data:'));
check('references: no network URLs in index.html', badRefs.length === 0, badRefs.join(', ') || 'all local or data:');
let missing = [];
for (const r of refs) {
  if (r.startsWith('data:')) continue;
  const target = join(gameDir, r);
  if (!existsSync(target)) missing.push(r);
}
for (const { file, spec } of importSpecifiers) {
  if (spec.startsWith('data:') || spec.startsWith('node:')) continue;
  const base = join(gameDir, file, '..');
  if (!existsSync(join(base, spec))) missing.push(`${file} -> ${spec}`);
}
check('references: every local reference exists in game/', missing.length === 0, missing.join(', ') || 'all resolve');
check('references: no external URLs in scripts', !scripts.some((f) => /https?:\/\//.test(readFileSync(f.full, 'utf8'))));

// 3. screenshots: 3-4 images, <=256 KiB each, long side <=1280, short >=480.
const shotsDir = join(out1, 'screenshots');
const shots = readdirSync(shotsDir).filter((n) => !n.startsWith('.')).sort();
check('screenshots: 3-4 images', shots.length >= 3 && shots.length <= 4, shots.join(', '));
function jpegDimensions(buf) {
  // Minimal JPEG SOF parser: find a Start-Of-Frame marker.
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) { i += 1; continue; }
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}
for (const name of shots) {
  const buf = readFileSync(join(shotsDir, name));
  const sizeOk = buf.length <= 262144;
  const ext = extname(name).toLowerCase();
  let dimsOk = false;
  let dims = '';
  if (ext === '.jpg' || ext === '.jpeg') {
    const d = jpegDimensions(buf);
    if (d) {
      dims = `${d.width}x${d.height}`;
      dimsOk = Math.max(d.width, d.height) <= 1280 && Math.min(d.width, d.height) >= 480;
    }
  } else if (ext === '.png') {
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    dims = `${w}x${h}`;
    dimsOk = Math.max(w, h) <= 1280 && Math.min(w, h) >= 480;
  }
  check(`screenshots: ${name} <=256 KiB`, sizeOk, `${buf.length} bytes`);
  check(`screenshots: ${name} dimensions`, dimsOk, dims);
}

// 4. dossier_matches: byte-for-byte what buildDossier writes, <=1.5 MiB.
const dossierOnDisk = readFileSync(join(out1, 'dossier.json'));
const rebuilt = buildDossier(out1, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
check('dossier_matches: byte-identical to buildDossier', Buffer.compare(dossierOnDisk, Buffer.from(rebuilt)) === 0, `${dossierOnDisk.length} bytes`);
check('dossier_matches: <=1.5 MiB', dossierOnDisk.length <= 1572864, `${dossierOnDisk.length} bytes`);

// 5. run_deterministic: the two main.ts runs wrote identical trees.
function treeHashes(dir, base = '') {
  const out = {};
  for (const name of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const rel = base ? `${base}/${name.name}` : name.name;
    const full = join(dir, name.name);
    if (name.isDirectory()) Object.assign(out, treeHashes(full, rel));
    else out[rel] = readFileSync(full).toString('base64');
  }
  return out;
}
const t1 = treeHashes(out1);
const t2 = treeHashes(out2);
const keys1 = Object.keys(t1).sort();
const keys2 = Object.keys(t2).sort();
const sameKeys = JSON.stringify(keys1) === JSON.stringify(keys2);
const sameBytes = sameKeys && keys1.every((k) => t1[k] === t2[k]);
check('run_deterministic: two runs byte-identical', sameBytes, `${keys1.length} files`);
check('output: dossier.json present', existsSync(join(out1, 'dossier.json')));

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
