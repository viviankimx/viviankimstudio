// Takes a project off the site.
//
//   node scripts/remove-project.mjs <slug>            hide it (stays in content/, can be re-listed)
//   node scripts/remove-project.mjs <slug> --delete   delete its folder and images too
//
// Either way the slug is removed from the Featured, Stills and Motion lists in site.md.
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const slug = process.argv[2];
const del = process.argv.includes('--delete');
const dir = path.join('content/projects', slug || '');
if (!slug || slug.startsWith('--')) {
  console.error('Usage: node scripts/remove-project.mjs <slug> [--delete]');
  process.exit(1);
}
await fs.access(path.join(dir, 'index.md')).catch(() => {
  throw Error(`No project "${slug}" in content/projects/.`);
});

const site = await fs.readFile('content/site.md', 'utf8');
const lines = site.split('\n');
const next = lines.filter((l) => l.trim() !== `- ${slug}`);
await fs.writeFile('content/site.md', next.join('\n'));
const removedFrom = lines.length - next.length;

if (del) await fs.rm(dir, { recursive: true });
console.log(
  `${del ? 'Deleted' : 'Hid'} "${slug}" (removed from ${removedFrom} list${removedFrom === 1 ? '' : 's'} in site.md).`,
);
execFileSync(process.execPath, ['scripts/media.mjs'], { stdio: 'inherit' });
