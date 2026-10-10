import sharp from 'sharp';
import { readFile, writeFile, stat } from 'node:fs/promises';
const c = JSON.parse(await readFile('data/content.json', 'utf8'));
const covers = new Set(c.projects.map((p) => p.cover));
const sources = [
  ...new Set([
    ...covers,
    ...c.projects.flatMap((p) =>
      p.blocks.filter((b) => b.type === 'image').map((b) => b.src),
    ),
    ...c.memories.items.map((m) => m.src),
  ]),
].filter((s) => /^\/media\/[\w-]+\.(jpe?g|png|webp|gif)$/i.test(s));
const manifest = {};
let originalBytes = 0,
  smallBytes = 0;
for (const src of sources) {
  const input = 'public' + src;
  try {
    const m = await sharp(input).metadata();
    const rotated = [5, 6, 7, 8].includes(m.orientation);
    const width = rotated ? m.height : m.width,
      height = rotated ? m.width : m.height;
    manifest[src] = { width, height };
    if (!covers.has(src) || (m.pages || 1) > 1) continue;
    const variants = [];
    for (const target of [640, 1280]) {
      if (width <= target) continue;
      const out = src.replace(/\.[^.]+$/, `-${target}.webp`);
      await sharp(input)
        .rotate()
        .resize({ width: target, withoutEnlargement: true })
        .webp({ quality: 90 })
        .toFile('public' + out);
      variants.push(`${out} ${target}w`);
      if (target === 640) {
        originalBytes += (await stat(input)).size;
        smallBytes += (await stat('public' + out)).size;
      }
    }
    if (variants.length)
      manifest[src].srcSet = [...variants, `${src} ${width}w`].join(', ');
  } catch (e) {
    console.error(src, e.message);
    process.exitCode = 1;
  }
}
await writeFile('data/media-metadata.json', JSON.stringify(manifest));
console.log(
  JSON.stringify({
    images: Object.keys(manifest).length,
    originalCoverBytes: originalBytes,
    smallCoverBytes: smallBytes,
  }),
);
