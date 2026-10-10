import { appwriteFetch, AppwriteError, createFile, mediaBucket, mediaId, filesPath } from './appwrite.ts';
import { sniffMedia } from './media-type.ts';
export async function uploadMedia(req: Request) {
  const size = Number(req.headers.get('x-file-size'));
  if (!Number.isSafeInteger(size) || size < 12 || size > 50_000_000) throw Error('Choose a file under 50 MB.');
  const reader = req.body?.getReader();
  if (!reader) throw Error('Choose a file');
  const originalName = decodeURIComponent(req.headers.get('x-file-name') || 'upload');
  let filename = '', id = '', offset = 0, pending = new Uint8Array(0), completed = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (value) {
        if (offset + pending.length + value.length > size) throw Error('Upload size does not match the file.');
        const joined = new Uint8Array(pending.length + value.length);
        joined.set(pending); joined.set(value, pending.length); pending = joined;
      }
      while (pending.length >= 5_000_000 || (done && pending.length)) {
        const length = Math.min(pending.length, 5_000_000);
        const chunk = pending.slice(0, length); pending = pending.slice(length);
        if (!filename) { filename = crypto.randomUUID() + sniffMedia(chunk).ext; id = mediaId(filename); }
        const mime = offset === 0 ? sniffMedia(chunk).mime : 'application/octet-stream';
        await createFile(mediaBucket(), id, filename, chunk, mime, offset, size);
        offset += length;
      }
      if (done) break;
    }
    if (offset !== size) throw Error('Incomplete upload. Please retry.');
    completed = true;
    return { src: '/media/' + filename, type: /\.(mp4|webm)$/.test(filename) ? 'video' : 'image', name: originalName };
  } finally {
    await reader.cancel().catch(() => {}); reader.releaseLock();
    if (!completed && id) await appwriteFetch(`${filesPath(mediaBucket())}/${id}`, { method: 'DELETE' }).catch(() => {});
  }
}
export async function serveMedia(req: Request, { params }: { params: Promise<{ file: string }> }, head = false) {
  const { file } = await params;
  if (!/^[a-zA-Z0-9-]+\.(jpg|jpeg|png|gif|webp|mp4|webm)$/.test(file)) return new Response('Not found', { status: 404 });
  const cacheKey = new Request(new URL('/media/' + file, req.url).href);
  const cache = typeof caches !== 'undefined' ? await caches.open('studio-media-v1') : null;
  const cached = await cache?.match(req.headers.has('range') ? new Request(cacheKey, { headers: { Range: req.headers.get('range')! } }) : cacheKey);
  if (cached) return head ? new Response(null, { status: cached.status, headers: cached.headers }) : cached;
  try {
    const headers = new Headers();
    if (req.headers.has('range')) headers.set('Range', req.headers.get('range')!);
    const response = await appwriteFetch(`${filesPath(mediaBucket())}/${mediaId(file)}/view`, { headers });
    const safe = new Headers({ 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' });
    for (const h of ['content-type','content-length','content-range','accept-ranges','etag']) if (response.headers.has(h)) safe.set(h, response.headers.get(h)!);
    const result = new Response(response.body, { status: response.status, headers: safe });
    if (head) { await result.body?.cancel(); return new Response(null, { status: result.status, headers: safe }); }
    if (cache && result.status === 200) await cache.put(cacheKey, result.clone()).catch(() => {});
    return result;
  } catch (error) {
    if (error instanceof AppwriteError && error.status === 404) return new Response('Not found', { status: 404 });
    if (error instanceof AppwriteError && error.status === 416) return new Response(null, { status: 416 });
    return new Response('Media temporarily unavailable', { status: 503 });
  }
}
