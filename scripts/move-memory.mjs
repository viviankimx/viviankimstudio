// Moves one Memories photo to a new position and renumbers the rest.
//
//   node scripts/move-memory.mjs 45 1      # photo 045 becomes the first photo
//   node scripts/move-memory.mjs 012.jpg 30
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { DIR, listPhotos, readNotes, writeNotes, renumber } from './memories-lib.mjs';

const [which, to] = process.argv.slice(2);
const photos = await listPhotos();
const from = photos.findIndex(
  (f) => f === which || path.parse(f).name === which || Number(path.parse(f).name) === Number(which),
);
const position = Number(to);
if (from < 0 || !Number.isInteger(position) || position < 1) {
  console.error('Usage: node scripts/move-memory.mjs <photo name or number> <new position, 1 = first>');
  process.exit(1);
}
const order = [...photos];
const [moved] = order.splice(from, 1);
order.splice(Math.min(position, order.length + 1) - 1, 0, moved);

const notes = await readNotes();
const { renamed } = await renumber(order.map((f) => path.join(DIR, f)), () => {});
const entries = new Map();
for (const [oldName, note] of notes.entries) if (renamed.has(oldName)) entries.set(renamed.get(oldName), note);
await writeNotes({ head: notes.head, entries }, await listPhotos());

console.log(`Moved ${moved} to position ${Math.min(position, order.length)}.`);
execFileSync(process.execPath, ['scripts/media.mjs'], { stdio: 'inherit' });
