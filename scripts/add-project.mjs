// Creates a project folder from a set of images and lists it in site.md.
//
//   node scripts/add-project.mjs --slug summer-self-service --title "SELF-SERVICE" \
//     --subtitle "Summer" --category stills [--featured] [--bottom] \
//     [--video https://vimeo.com/123] <image or folder>...
//
// Images become 01.jpg, 02.jpg… in the order given (folder contents sorted by
// name); the first is the cover. --video adds an embed above the images
// (repeatable). The project is added to the top of its Stills/Motion list
// (and Featured with --featured) unless --bottom is given.
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const IMAGE = /\.(jpe?g|png|webp|avif|gif|tiff?|heic|heif|mp4|webm)$/i;
const argv = process.argv.slice(2);
const opts = { video: [] };
const inputs = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--featured' || a === '--bottom') opts[a.slice(2)] = true;
  else if (a.startsWith('--')) {
    const key = a.slice(2);
    if (key === 'video') opts.video.push(argv[++i]);
    else opts[key] = argv[++i];
  } else inputs.push(a);
}
const { slug, title, subtitle = '', category } = opts;
if (!slug || !title || !['stills', 'motion'].includes(category) || (!inputs.length && !opts.video.length)) {
  console.error('Usage: node scripts/add-project.mjs --slug <slug> --title <title> [--subtitle <s>] --category stills|motion [--featured] [--bottom] [--video <url>] <images>...');
  process.exit(1);
}
if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) throw Error('Slug must be lowercase letters, numbers and hyphens.');
const dir = path.join('content/projects', slug);
try {
  await fs.access(dir);
  throw Error(`${dir} already exists. Edit it instead, or pick another slug.`);
} catch (e) {
  if (e.code !== 'ENOENT') throw e;
}

const files = [];
for (const input of inputs) {
  if ((await fs.stat(input)).isDirectory())
    files.push(
      ...(await fs.readdir(input))
        .filter((f) => IMAGE.test(f) && !f.startsWith('.'))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
        .map((f) => path.join(input, f)),
    );
  else if (IMAGE.test(input)) files.push(input);
  else console.warn(`skipping (not an image/video): ${input}`);
}

await fs.mkdir(dir, { recursive: true });
const names = [];
for (const [i, src] of files.entries()) {
  const base = String(i + 1).padStart(2, '0');
  let ext = path.extname(src).toLowerCase();
  if (ext === '.jpeg') ext = '.jpg';
  if (/^\.hei[cf]$/.test(ext)) {
    execFileSync('sips', ['-s', 'format', 'jpeg', src, '--out', path.join(dir, base + '.jpg')], { stdio: 'ignore' });
    ext = '.jpg';
  } else await fs.copyFile(src, path.join(dir, base + ext));
  names.push(base + ext);
}
// Look up each film's proportions so the player fills the column like the
// reference site (vertical and 4:3 films are common). Falls back to 16:9.
async function withSize(url) {
  const endpoint = /vimeo\.com/.test(url)
    ? `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`
    : /youtu\.?be/.test(url)
      ? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`
      : null;
  try {
    const r = endpoint && (await fetch(endpoint, { signal: AbortSignal.timeout(10_000) }));
    if (r?.ok) {
      const { width, height } = await r.json();
      if (width && height) return `${url} ${width}x${height}`;
    }
  } catch {}
  console.warn(`Couldn't read the size of ${url}; it will show as 16:9. Add " WIDTHxHEIGHT" after the link in index.md if that's wrong.`);
  return url;
}
const videos = await Promise.all(opts.video.map(withSize));
const cover = names.find((n) => !/\.(mp4|webm)$/.test(n));
const md = [
  '---',
  `title: ${title}`,
  `subtitle: ${subtitle}`,
  ...(cover ? [`cover: ${cover}`] : []),
  '---',
  '',
  ...videos,
  ...names.map((n) => `![](${n})`),
  '',
];
await fs.writeFile(path.join(dir, 'index.md'), md.join('\n'));

// List it in site.md.
let site = await fs.readFile('content/site.md', 'utf8');
const addTo = (section) => {
  const re = new RegExp(`(## ${section}\\n\\n)((?:- .*\\n)*)`);
  const m = re.exec(site);
  if (!m) throw Error(`site.md has no "## ${section}" list`);
  const list = opts.bottom ? m[2] + `- ${slug}\n` : `- ${slug}\n` + m[2];
  site = site.replace(re, m[1] + list);
};
addTo(category === 'stills' ? 'Stills' : 'Motion');
if (opts.featured) addTo('Featured');
await fs.writeFile('content/site.md', site);

console.log(`Created ${dir} with ${names.length} file(s)${opts.video.length ? ` and ${opts.video.length} embed(s)` : ''}; listed under ${category}${opts.featured ? ' and Featured' : ''}.`);
if (!cover) console.warn('No image for a cover. Add one and set `cover:` in index.md.');
execFileSync(process.execPath, ['scripts/media.mjs'], { stdio: 'inherit' });
