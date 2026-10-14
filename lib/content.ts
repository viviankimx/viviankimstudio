// Reads the Markdown + image folders in content/ into the data the pages render.
// Format reference: CLAUDE.md. Media dimensions/srcsets come from scripts/media.mjs.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

export type Media = { width?: number; height?: number; srcSet?: string };
export type Block = {
  type: 'image' | 'video' | 'embed';
  src: string;
  caption: string;
  media?: Media;
  // Embeds only: the film's own proportions, e.g. "1920 / 1080". Default 16:9.
  ratio?: string;
};
export type Category = 'stills' | 'motion';
export type Project = {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  category: Category;
  cover: string;
  coverMedia?: Media;
  blocks: Block[];
};
export type Memory = { id: string; src: string; caption: string } & Media;
export type Site = {
  navigation: { label: string; href: string }[];
  hero: { copy: string; video: string; poster: string };
  clients: string[];
  footer: { instagram: string; email: string; location: string };
  featured: string[];
  stills: string[];
  motion: string[];
  memories: { title: string; columns: number; gap: number; items: Memory[] };
  projects: Record<string, Project>;
};

const contentDir = path.resolve('content');
const VIDEO = /\.(mp4|webm|mov)$/i;
const IMAGE = /\.(jpe?g|png|gif|webp|avif)$/i;

export function parseMarkdown(md: string) {
  const data: Record<string, string> = {};
  let body = md.replace(/\r\n/g, '\n');
  const fm = /^---\n([\s\S]*?)\n---\n?/.exec(body);
  if (fm) {
    for (const line of fm[1].split('\n')) {
      const i = line.indexOf(':');
      if (i > 0) data[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
    body = body.slice(fm[0].length);
  }
  return { data, body };
}

export function sections(body: string) {
  const out: Record<string, string> = {};
  for (const part of body.split(/^## /m).slice(1)) {
    const nl = part.indexOf('\n');
    const name = (nl < 0 ? part : part.slice(0, nl)).trim().toLowerCase();
    out[name] = nl < 0 ? '' : part.slice(nl + 1).trim();
  }
  return out;
}

const list = (text = '') =>
  text
    .split('\n')
    .map((l) => /^\s*[-*]\s+(.+)$/.exec(l)?.[1].trim())
    .filter((x): x is string => !!x);

// Accepts normal YouTube/Vimeo page links as well as player URLs.
export function embedUrl(line: string) {
  let u: URL;
  try {
    u = new URL(line);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, '');
  if (host === 'player.vimeo.com' || /^youtube(-nocookie)?\.com$/.test(host)) {
    if (u.pathname.startsWith('/watch'))
      return `https://www.youtube.com/embed/${u.searchParams.get('v')}`;
    if (u.pathname.startsWith('/video/') || u.pathname.startsWith('/embed/'))
      return u.toString();
  }
  if (host === 'youtu.be') return `https://www.youtube.com/embed${u.pathname}`;
  if (host === 'vimeo.com' && /^\/\d+/.test(u.pathname))
    return `https://player.vimeo.com/video${u.pathname}`;
  return null;
}

export function parseProject(slug: string, md: string, category: Category): Project {
  const { data, body } = parseMarkdown(md);
  const blocks: Block[] = [];
  const text: string[] = [];
  for (const raw of body.split('\n')) {
    const line = raw.trim();
    const img = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(line);
    // An embed line is a link, optionally followed by the film's size: `URL 1920x1080`.
    const embedLine = img ? null : /^(\S+)(?:\s+(\d+)\s*[x×:]\s*(\d+))?$/.exec(line);
    const embed = embedLine ? embedUrl(embedLine[1]) : null;
    if (img)
      blocks.push({
        type: VIDEO.test(img[2]) ? 'video' : 'image',
        src: img[2],
        caption: img[1],
      });
    else if (embed)
      blocks.push({
        type: 'embed',
        src: embed,
        caption: '',
        ...(embedLine![2] ? { ratio: `${embedLine![2]} / ${embedLine![3]}` } : {}),
      });
    else text.push(raw);
  }
  if (!data.title) throw Error(`content/projects/${slug}/index.md: missing title`);
  return {
    slug,
    title: data.title,
    subtitle: data.subtitle || '',
    description: text.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
    category,
    cover: data.cover || blocks.find((b) => b.type === 'image')?.src || '',
    blocks,
  } satisfies Project;
}

function readManifest(): Record<string, Media> {
  const file = path.resolve('.generated/media.json');
  if (!existsSync(file))
    throw Error('Media manifest missing. Run `npm run media` first.');
  return JSON.parse(readFileSync(file, 'utf8'));
}

function mediaUrl(rel: string, manifest: Record<string, Media>, where: string) {
  const url = '/media/' + rel.split(path.sep).join('/');
  if (!existsSync(path.join(contentDir, rel)))
    throw Error(`${where}: file not found: content/${rel}`);
  return { url, media: manifest[url] };
}

// Memories photo lines: `- 001.jpg | 2026-10-12 | alt text` (or the older
// `- 001.jpg: alt text`). Returns [file, alt] or null for other lines.
export function parseMemoryLine(line: string): [string, string] | null {
  const m = /^\s*-\s+([^\s|:]+\.\w+)\s*(?:\|[^|]*(?:\|\s*(.*))?|:\s*(.*))$/.exec(line);
  return m ? [m[1], (m[2] ?? m[3] ?? '').trim()] : null;
}

let cache: Site | undefined;
export function getSite(): Site {
  if (cache) return cache;
  const manifest = readManifest();
  const site = parseMarkdown(readFileSync(path.join(contentDir, 'site.md'), 'utf8'));
  const s = sections(site.body);
  const featured = list(s.featured);
  const stills = list(s.stills);
  const motion = list(s.motion);
  const projects: Record<string, Project> = {};
  const projectDir = path.join(contentDir, 'projects');
  const folders = readdirSync(projectDir).filter((f) =>
    existsSync(path.join(projectDir, f, 'index.md')),
  );
  for (const [category, slugs] of [
    ['stills', stills],
    ['motion', motion],
  ] as const)
    for (const slug of slugs) {
      if (!folders.includes(slug))
        throw Error(`site.md lists "${slug}" but content/projects/${slug}/index.md does not exist`);
      if (projects[slug]) throw Error(`site.md lists "${slug}" more than once`);
      const where = `content/projects/${slug}/index.md`;
      const p = parseProject(
        slug,
        readFileSync(path.join(projectDir, slug, 'index.md'), 'utf8'),
        category,
      );
      for (const b of p.blocks)
        if (b.type !== 'embed') {
          const m = mediaUrl(path.join('projects', slug, b.src), manifest, where);
          b.src = m.url;
          b.media = m.media;
        }
      if (p.cover) {
        const m = mediaUrl(path.join('projects', slug, p.cover), manifest, where);
        p.cover = m.url;
        p.coverMedia = m.media;
      }
      projects[slug] = p;
    }
  for (const slug of featured)
    if (!projects[slug])
      throw Error(`site.md Featured lists "${slug}", which is not under Stills or Motion`);
  for (const f of folders)
    if (!projects[f])
      console.warn(`[content] content/projects/${f} is not listed in site.md (hidden)`);

  const mem = parseMarkdown(readFileSync(path.join(contentDir, 'memories.md'), 'utf8'));
  const captions = Object.fromEntries(
    mem.body
      .split('\n')
      .map(parseMemoryLine)
      .filter((x): x is [string, string] => !!x),
  );
  const items = readdirSync(path.join(contentDir, 'memories'))
    .filter((f) => IMAGE.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((f) => {
      const { url, media } = mediaUrl(path.join('memories', f), manifest, 'memories');
      return { id: f, src: url, caption: captions[f] || '', ...media };
    });

  const d = site.data;
  const result: Site = {
    navigation: list(s.navigation).map((l) => {
      const m = /^\[(.+)\]\((.+)\)$/.exec(l);
      if (!m) throw Error(`site.md Navigation: expected "- [Label](link)", got "${l}"`);
      return { label: m[1], href: m[2] };
    }),
    hero: {
      copy: s.hero || '',
      video: mediaUrl(d.hero_video, manifest, 'site.md').url,
      poster: mediaUrl(d.hero_poster, manifest, 'site.md').url,
    },
    clients: list(s.clients),
    footer: { instagram: d.instagram, email: d.email, location: d.location },
    featured,
    stills,
    motion,
    memories: {
      title: mem.data.title || 'Memories',
      columns: Number(mem.data.columns) || 4,
      gap: Number(mem.data.gap) || 8,
      items,
    },
    projects,
  };
  if (process.env.NODE_ENV === 'production') cache = result;
  return result;
}

// Only what a given page renders is sent to the browser.
export function pageContent(route: '' | Category | 'memories' | `project/${string}`) {
  const s = getSite();
  const pick = (slugs: string[]) => slugs.map((x) => s.projects[x]);
  const projects =
    route === ''
      ? pick(s.featured)
      : route === 'stills' || route === 'motion'
        ? pick(s[route])
        : route.startsWith('project/')
          ? pick([route.slice(8)])
          : [];
  return {
    navigation: s.navigation,
    footer: s.footer,
    hero: route === '' ? s.hero : undefined,
    clients: route === '' ? s.clients : [],
    memories: route === 'memories' ? s.memories : undefined,
    projects: projects.map((p) =>
      route.startsWith('project/') ? p : { ...p, blocks: [] },
    ),
  };
}
export type PageContent = ReturnType<typeof pageContent>;
