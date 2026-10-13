// Adds photos to Memories, renumbering so filename order = display order.
//
//   node scripts/add-memories.mjs [--bottom] <image or folder>...
//
// New photos go to the top (newest first) unless --bottom is given. Files and
// folders are added in the order given; folder contents are sorted by name.
// HEIC files are converted with macOS `sips`. Run `npm run media` afterwards
// (the script does it for you) to compress and generate variants.
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const DIR = 'content/memories';
const MD = 'content/memories.md';
const IMAGE = /\.(jpe?g|png|webp|avif|gif|tiff?|heic|heif)$/i;
const args = process.argv.slice(2);
const bottom = args.includes('--bottom');
const inputs = args.filter((a) => !a.startsWith('--'));
if (!inputs.length) {
  console.error('Usage: node scripts/add-memories.mjs [--bottom] <image or folder>...');
  process.exit(1);
}

const incoming = [];
for (const input of inputs) {
  const stat = await fs.stat(input);
  if (stat.isDirectory()) {
    const names = (await fs.readdir(input))
      .filter((f) => IMAGE.test(f) && !f.startsWith('.'))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    incoming.push(...names.map((f) => path.join(input, f)));
  } else if (IMAGE.test(input)) incoming.push(input);
  else console.warn(`skipping (not an image): ${input}`);
}
if (!incoming.length) throw Error('No images found in the given paths.');

const existing = (await fs.readdir(DIR))
  .filter((f) => IMAGE.test(f))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  .map((f) => path.join(DIR, f));
const ordered = bottom ? [...existing, ...incoming] : [...incoming, ...existing];
const width = Math.max(3, String(ordered.length).length);

// Stage everything in a temp folder first so renames can't collide.
const tmp = path.join(DIR, '.renumber');
await fs.rm(tmp, { recursive: true, force: true });
await fs.mkdir(tmp);
const renames = {};
for (const [i, src] of ordered.entries()) {
  const base = String(i + 1).padStart(width, '0');
  let ext = path.extname(src).toLowerCase();
  if (ext === '.jpeg') ext = '.jpg';
  if (/^\.hei[cf]$/.test(ext)) {
    execFileSync('sips', ['-s', 'format', 'jpeg', src, '--out', path.join(tmp, base + '.jpg')], { stdio: 'ignore' });
    ext = '.jpg';
  } else if (existing.includes(src)) await fs.rename(src, path.join(tmp, base + ext));
  else await fs.copyFile(src, path.join(tmp, base + ext));
  if (existing.includes(src)) renames[path.basename(src)] = base + ext;
}
for (const f of await fs.readdir(tmp)) await fs.rename(path.join(tmp, f), path.join(DIR, f));
await fs.rm(tmp, { recursive: true });

// Keep alt-text lines in memories.md pointing at the right photo.
const md = await fs.readFile(MD, 'utf8');
const next = md.replace(/^(\s*-\s+)([^:\n]+?)(:\s)/gm, (m, a, name, b) =>
  renames[name.trim()] ? a + renames[name.trim()] + b : m,
);
if (next !== md) await fs.writeFile(MD, next);

console.log(`Added ${incoming.length} photo(s) to the ${bottom ? 'bottom' : 'top'} of Memories (${ordered.length} total).`);
execFileSync(process.execPath, ['scripts/media.mjs'], { stdio: 'inherit' });
