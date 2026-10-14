// Removes photos from Memories and closes the gaps in the numbering.
//
//   node scripts/remove-memories.mjs 003.jpg 017.jpg
//
// Names are the files in content/memories/ (a bare number like 3 works too).
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { DIR, listPhotos, readNotes, writeNotes, renumber } from './memories-lib.mjs';

const photos = await listPhotos();
const targets = process.argv.slice(2).map((arg) => {
  const match = photos.find((f) => f === arg || path.parse(f).name === arg || Number(path.parse(f).name) === Number(arg));
  if (!match) throw Error(`No Memories photo named "${arg}". Photos are named like ${photos[0]}.`);
  return match;
});
if (!targets.length) {
  console.error('Usage: node scripts/remove-memories.mjs <photo name or number>...');
  process.exit(1);
}

const notes = await readNotes();
for (const t of targets) {
  await fs.rm(path.join(DIR, t));
  notes.entries.delete(t);
}
const remaining = (await listPhotos()).map((f) => path.join(DIR, f));
const { renamed } = await renumber(remaining, () => {});
const entries = new Map();
for (const [oldName, note] of notes.entries) if (renamed.has(oldName)) entries.set(renamed.get(oldName), note);
await writeNotes({ head: notes.head, entries }, await listPhotos());

console.log(`Removed ${targets.length} photo(s) from Memories (${remaining.length} left).`);
execFileSync(process.execPath, ['scripts/media.mjs'], { stdio: 'inherit' });
