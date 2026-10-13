// Prepares images in content/ for the site.
//
//   npm run media            Compress any new/oversized photos in content/ in place,
//                            then mirror content/ to public/media/ with responsive
//                            WebP variants and write .generated/media.json.
//   npm run media -- --check Report problems without changing content/.
//
// Photos are capped at 2400px on the long edge (JPEG q82). PNG photos without
// transparency become .jpg and their Markdown references are updated.
import sharp from 'sharp';
import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

const CONTENT = 'content';
const OUT = 'public/media';
const MANIFEST = '.generated/media.json';
const MAX_EDGE = 2400;
const MAX_JPEG_BYTES = 1.5e6;
const VARIANTS = [640, 1280];
const IMAGE = /\.(jpe?g|png|webp|avif|gif|tiff?)$/i;
const COPY = /\.(jpe?g|png|webp|avif|gif|tiff?|mp4|webm|mov)$/i;
const check = process.argv.includes('--check');

async function walk(dir) {
  const out = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

const newer = async (a, b) => {
  try {
    return (await fs.stat(a)).mtimeMs > (await fs.stat(b)).mtimeMs;
  } catch {
    return true;
  }
};

// 1. Compress oversized originals in content/.
async function normalize(file) {
  if (/\.gif$/i.test(file)) return file;
  const buf = await fs.readFile(file);
  const meta = await sharp(buf).metadata();
  const edge = Math.max(meta.width, meta.height);
  const isPng = meta.format === 'png';
  const transparent = meta.hasAlpha && !(await sharp(buf).stats()).isOpaque;
  const tooBig =
    edge > MAX_EDGE ||
    (meta.format === 'jpeg' && buf.length > MAX_JPEG_BYTES) ||
    (isPng && !transparent) ||
    meta.format === 'tiff';
  if (!tooBig) return file;
  if (check) {
    console.log(`needs compression: ${file} (${edge}px, ${(buf.length / 1e6).toFixed(1)}MB)`);
    process.exitCode = 1;
    return file;
  }
  const img = sharp(buf)
    .rotate()
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true });
  const target = transparent
    ? file.replace(/\.[^.]+$/, '.webp')
    : file.replace(/\.[^.]+$/, '.jpg');
  const data = transparent
    ? await img.webp({ quality: 85 }).toBuffer()
    : await img.flatten({ background: '#fff' }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  await fs.writeFile(target, data);
  if (target !== file) {
    await fs.rm(file);
    await renameReferences(path.dirname(file), path.basename(file), path.basename(target));
  }
  console.log(
    `compressed ${file} -> ${path.basename(target)} (${(buf.length / 1e6).toFixed(1)}MB -> ${(data.length / 1e6).toFixed(1)}MB)`,
  );
  return target;
}

async function renameReferences(dir, from, to) {
  const candidates = [path.join(dir, 'index.md'), path.join(CONTENT, 'site.md'), path.join(CONTENT, 'memories.md')];
  for (const md of candidates) {
    let text;
    try {
      text = await fs.readFile(md, 'utf8');
    } catch {
      continue;
    }
    const next = text.replaceAll(`(${from})`, `(${to})`).replaceAll(`: ${from}`, `: ${to}`);
    if (next !== text) await fs.writeFile(md, next);
  }
}

// 2. Mirror to public/media with variants, and record dimensions.
const files = (await walk(CONTENT)).filter((f) => COPY.test(f));
const manifest = {};
const expected = new Set();
for (let file of files) {
  if (IMAGE.test(file)) file = await normalize(file);
  if (check) continue;
  const rel = path.relative(CONTENT, file);
  const dest = path.join(OUT, rel);
  const url = '/media/' + rel.split(path.sep).join('/');
  expected.add(dest);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  if (await newer(file, dest)) {
    await fs.rm(dest, { force: true });
    // Copy-on-write clone where supported (APFS), plain copy otherwise.
    await fs.copyFile(file, dest, constants.COPYFILE_FICLONE);
  }
  if (!IMAGE.test(file)) continue;
  const meta = await sharp(file).metadata();
  const rotated = [5, 6, 7, 8].includes(meta.orientation);
  const width = rotated ? meta.height : meta.width;
  const height = rotated ? meta.width : meta.height;
  manifest[url] = { width, height };
  if (meta.format === 'gif') continue;
  const srcSet = [];
  for (const w of VARIANTS) {
    if (width <= w * 1.25) continue;
    const variant = dest.replace(/\.[^.]+$/, `-${w}.webp`);
    expected.add(variant);
    if (await newer(file, variant))
      await sharp(file).rotate().resize({ width: w }).webp({ quality: 82 }).toFile(variant);
    srcSet.push(`${url.replace(/\.[^.]+$/, `-${w}.webp`)} ${w}w`);
  }
  if (srcSet.length) manifest[url].srcSet = [...srcSet, `${url} ${width}w`].join(', ');
}

if (!check) {
  // Remove files whose source was deleted or renamed.
  try {
    for (const f of await walk(OUT)) if (!expected.has(f)) await fs.rm(f);
  } catch {}
  await fs.mkdir(path.dirname(MANIFEST), { recursive: true });
  await fs.writeFile(MANIFEST, JSON.stringify(manifest));
  console.log(`media: ${Object.keys(manifest).length} images ready`);
}
