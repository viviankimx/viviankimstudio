import {
  timingSafeEqual,
  createHash,
  randomUUID,
  createHmac,
} from 'node:crypto';
export { dataDir, readContent } from './storage.ts';
import { persistContent } from './storage.ts';
export function authorized(req: Request) {
  const password = process.env.CMS_PASSWORD;
  if (!password) return false;
  if (validSession(req)) return true;
  const expected =
    'Basic ' +
    Buffer.from(`${process.env.CMS_USERNAME || 'admin'}:${password}`).toString(
      'base64',
    );
  const hash = (v: string) => createHash('sha256').update(v).digest();
  return timingSafeEqual(
    hash(req.headers.get('authorization') || ''),
    hash(expected),
  );
}
export function guard(req: Request, mutate = false) {
  if (!authorized(req))
    return new Response('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate':
          'Basic realm="Vivian Kim Studio CMS", charset="UTF-8"',
        'Cache-Control': 'no-store',
      },
    });
  if (
    mutate &&
    req.headers.get('origin') !==
      (process.env.PUBLIC_ORIGIN || new URL(req.url).origin)
  )
    return Response.json(
      { error: 'Same-origin request required' },
      { status: 403 },
    );
  return null;
}
export function validUrl(s: unknown, embed = false) {
  if (typeof s !== 'string') return false;
  if (!s) return true;
  if (
    !embed &&
    (/^\/(?!\/)/.test(s) || s.startsWith('#') || /^mailto:[^\s]+$/.test(s))
  )
    return true;
  try {
    const u = new URL(s);
    return (
      u.protocol === 'https:' &&
      (!embed ||
        [
          'player.vimeo.com',
          'www.youtube.com',
          'www.youtube-nocookie.com',
          'www.youtube.com',
          'www.youtube-nocookie.com',
        ].includes(u.hostname))
    );
  } catch {
    return false;
  }
}
export function validate(c: any) {
  if (!c || c.version !== 1 || !Number.isInteger(c.revision))
    throw Error('Invalid content version');
  if (
    !Array.isArray(c.navigation) ||
    c.navigation.length < 2 ||
    c.navigation.length > 30 ||
    c.navigation.some(
      (n: any) => typeof n.label !== 'string' || !validUrl(n.href),
    )
  )
    throw Error('Invalid navigation');
  if (
    typeof c.hero?.copy !== 'string' ||
    !validUrl(c.hero.video) ||
    !validUrl(c.hero.poster) ||
    !Array.isArray(c.clients) ||
    c.clients.some((x: any) => typeof x !== 'string')
  )
    throw Error('Invalid homepage');
  if (!Array.isArray(c.projects) || c.projects.length > 3000)
    throw Error('Invalid projects');
  const ids = new Set(),
    slugs = new Set();
  for (const p of c.projects) {
    if (
      !/^[a-z0-9][a-z0-9-]*$/.test(p.slug) ||
      ids.has(p.id) ||
      slugs.has(p.slug) ||
      typeof p.title !== 'string' ||
      !p.title.trim() ||
      typeof p.subtitle !== 'string' ||
      typeof p.description !== 'string' ||
      typeof p.published !== 'boolean' ||
      !validUrl(p.cover) ||
      !['grid', 'stack'].includes(p.layout) ||
      !Array.isArray(p.categories) ||
      p.categories.some((v: any) => !['stills', 'motion'].includes(v))
    )
      throw Error('Invalid or duplicate project');
    ids.add(p.id);
    slugs.add(p.slug);
    if (!Array.isArray(p.blocks) || p.blocks.length > 1000)
      throw Error('Invalid blocks');
    for (const b of p.blocks)
      if (
        !['image', 'video', 'embed', 'text'].includes(b.type) ||
        !validUrl(b.src, b.type === 'embed') ||
        typeof b.caption !== 'string'
      )
        throw Error('Invalid project media');
  }
  for (const k of ['featured', 'stills', 'motion'])
    if (
      !Array.isArray(c.orders?.[k]) ||
      new Set(c.orders[k]).size !== c.orders[k].length ||
      c.orders[k].some((id: any) => !ids.has(id))
    )
      throw Error('Invalid project order');
  const m = c.memories;
  if (
    typeof m?.title !== 'string' ||
    !Array.isArray(m.items) ||
    m.items.length > 10000 ||
    !Number.isInteger(m.columns) ||
    m.columns < 1 ||
    m.columns > 6 ||
    !Number.isFinite(m.gap) ||
    m.gap < 0 ||
    m.gap > 64
  )
    throw Error('Invalid memories');
  const mids = new Set();
  for (const i of m.items) {
    if (
      mids.has(i.id) ||
      !validUrl(i.src) ||
      !Number.isFinite(i.width) ||
      i.width <= 0 ||
      !Number.isFinite(i.height) ||
      i.height <= 0 ||
      !Number.isFinite(Date.parse(i.date))
    )
      throw Error('Invalid memory image');
    mids.add(i.id);
  }
  if (
    !validUrl(c.footer?.instagram) ||
    typeof c.footer?.email !== 'string' ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.footer.email) ||
    typeof c.footer.location !== 'string'
  )
    throw Error('Invalid footer');
}
export function saveContent(c: any) {
  validate(c);
  return persistContent(c);
}
export async function limitedBody(req: Request, limit: number) {
  const reader = req.body?.getReader();
  if (!reader) throw Error('Empty request');
  let size = 0;
  const parts = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) {
      await reader.cancel();
      throw Error('Upload exceeds size limit');
    }
    parts.push(value);
  }
  return Buffer.concat(parts);
}
import metadata from '../data/media-metadata.json' with { type: 'json' };
const mediaMetadata: Record<string, any> = metadata;
export function publicContent(c: any, route?: string) {
  const published = c.projects.filter((p: any) => p.published);
  const detail = route?.startsWith('project/') ? route.slice(8) : null;
  const projects = published
    .filter(
      (p: any) =>
        route === undefined ||
        (detail
          ? p.slug === detail
          : route === 'memories'
            ? false
            : !route || p.categories.includes(route)),
    )
    .map((p: any) => ({
      ...p,
      coverMedia: mediaMetadata[p.cover],
      blocks:
        route === undefined || detail
          ? p.blocks.map((b: any) => ({ ...b, media: mediaMetadata[b.src] }))
          : [],
    }));
  const ids = new Set(projects.map((p: any) => p.id));
  return {
    navigation: c.navigation,
    footer: c.footer,
    hero: route === undefined || !route ? c.hero : undefined,
    clients: route === undefined || !route ? c.clients : [],
    memories:
      route === undefined || route === 'memories' ? c.memories : undefined,
    projects,
    orders: Object.fromEntries(
      Object.entries(c.orders).map(([k, v]: any) => [
        k,
        v.filter((id: string) => ids.has(id)),
      ]),
    ),
  };
}
export function sessionToken() {
  const payload = String(Date.now() + 8 * 60 * 60 * 1000);
  return payload + '.' + sessionMac(payload);
}
function sessionMac(payload: string) {
  return createHmac('sha256', process.env.CMS_PASSWORD || randomUUID())
    .update(payload)
    .digest('hex');
}
function validSession(req: Request) {
  const value = (req.headers.get('cookie') || '')
    .split(';')
    .map((x) => x.trim())
    .find((x) => x.startsWith('vk_session='))
    ?.slice(11);
  if (!value) return false;
  const [expires, mac] = value.split('.');
  if (
    !/^\d+$/.test(expires) ||
    Number(expires) < Date.now() ||
    !mac ||
    !/^[a-f0-9]{64}$/.test(mac)
  )
    return false;
  return timingSafeEqual(
    Buffer.from(mac, 'hex'),
    Buffer.from(sessionMac(expires), 'hex'),
  );
}
