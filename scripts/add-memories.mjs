// Adds photos to Memories, renumbering so filename order = display order.
//
//   node scripts/add-memories.mjs [--bottom] [--date YYYY-MM-DD] <image or folder>...
//
// New photos go to the top (newest first) unless --bottom is given. Files and
// folders are added in the order given; folder contents are sorted by name.
// Each new photo is logged in memories.md with its upload date (today unless
// --date is given). HEIC files are converted with macOS `sips`. Compression
// runs automatically at the end.
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { DIR, IMAGE, today, listPhotos, readNotes, writeNotes, renumber } from './memories-lib.mjs';

const inputs = [];
let bottom = false;
let date = today();
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a === '--bottom') bottom = true;
  else if (a === '--date') date = process.argv[++i];
  else inputs.push(a);
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) throw Error('--date must look like 2026-10-12');
if (!inputs.length) {
  console.error('Usage: node scripts/add-memories.mjs [--bottom] [--date YYYY-MM-DD] <image or folder>...');
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

const existing = (await listPhotos()).map((f) => path.join(DIR, f));
const notes = await readNotes();
const { renamed, added } = await renumber(bottom ? [...existing, ...incoming] : [...incoming, ...existing], (src, out) =>
  execFileSync('sips', ['-s', 'format', 'jpeg', src, '--out', out], { stdio: 'ignore' }),
);

const entries = new Map();
for (const [oldName, note] of notes.entries) if (renamed.has(oldName)) entries.set(renamed.get(oldName), note);
for (const name of added) entries.set(name, { date, alt: '' });
await writeNotes({ head: notes.head, entries }, await listPhotos());

console.log(`Added ${incoming.length} photo(s) to the ${bottom ? 'bottom' : 'top'} of Memories, dated ${date} (${existing.length + incoming.length} total).`);
execFileSync(process.execPath, ['scripts/media.mjs'], { stdio: 'inherit' });
