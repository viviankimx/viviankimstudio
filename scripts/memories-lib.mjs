// Shared helpers for the Memories scripts: ordered listing, safe renumbering,
// and the per-photo lines in content/memories.md.
//
// memories.md photo lines look like:  - 001.jpg | 2026-10-12 | Optional alt text
// (the older `- 001.jpg: alt text` form is still understood).
import fs from 'node:fs/promises';
import path from 'node:path';

export const DIR = 'content/memories';
export const MD = 'content/memories.md';
export const IMAGE = /\.(jpe?g|png|webp|avif|gif|tiff?|heic|heif)$/i;
const LINE = /^\s*-\s+([^\s|:]+\.\w+)\s*(?:\|\s*(\d{4}-\d{2}-\d{2})?\s*(?:\|\s*(.*))?|:\s*(.*))$/;

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export async function listPhotos() {
  return (await fs.readdir(DIR))
    .filter((f) => IMAGE.test(f) && !f.startsWith('.'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

// Reads memories.md into { head, entries: Map(name -> {date, alt}) }.
export async function readNotes() {
  const text = await fs.readFile(MD, 'utf8');
  const head = [];
  const entries = new Map();
  for (const line of text.split('\n')) {
    const m = LINE.exec(line);
    if (m) entries.set(m[1], { date: m[2] || '', alt: (m[3] ?? m[4] ?? '').trim() });
    else head.push(line);
  }
  while (head.length && head.at(-1) === '') head.pop();
  return { head, entries };
}

export async function writeNotes({ head, entries }, order) {
  const lines = order
    .filter((n) => entries.has(n))
    .map((n) => {
      const { date, alt } = entries.get(n);
      return `- ${n} | ${date || ''} | ${alt || ''}`.trimEnd();
    });
  await fs.writeFile(MD, [...head, '', ...lines, ''].join('\n'));
}

// Gives `ordered` (paths, existing files in DIR or new files elsewhere) the names
// 001, 002… in that order. Returns a map of old basename -> new basename for the
// existing photos and the new names for incoming files.
export async function renumber(ordered, convertHeic) {
  const width = Math.max(3, String(ordered.length).length);
  const tmp = path.join(DIR, '.renumber');
  await fs.rm(tmp, { recursive: true, force: true });
  await fs.mkdir(tmp);
  const renamed = new Map();
  const added = [];
  for (const [i, src] of ordered.entries()) {
    const base = String(i + 1).padStart(width, '0');
    let ext = path.extname(src).toLowerCase();
    if (ext === '.jpeg') ext = '.jpg';
    const existing = path.dirname(path.resolve(src)) === path.resolve(DIR);
    if (/^\.hei[cf]$/.test(ext)) {
      await convertHeic(src, path.join(tmp, base + '.jpg'));
      ext = '.jpg';
      if (existing) await fs.rm(src);
    } else if (existing) await fs.rename(src, path.join(tmp, base + ext));
    else await fs.copyFile(src, path.join(tmp, base + ext));
    if (existing) renamed.set(path.basename(src), base + ext);
    else added.push(base + ext);
  }
  for (const f of await fs.readdir(tmp)) await fs.rename(path.join(tmp, f), path.join(DIR, f));
  await fs.rm(tmp, { recursive: true });
  return { renamed, added };
}
