import { bucket } from './storage-cloudflare';
import { sniffMedia } from './media-type';
export async function uploadMedia(req: Request) {
  const storage = bucket();
  const size = Number(req.headers.get('x-file-size'));
  if (!Number.isSafeInteger(size) || size < 12 || size > 99 * 1024 * 1024) throw Error('Choose a file under 99 MB');
  const name = decodeURIComponent(req.headers.get('x-file-name') || 'upload');
  const reader = req.body?.getReader();
  if (!reader) throw Error('Choose a file');
  let writer: WritableStreamDefaultWriter<Uint8Array> | undefined;
  let pump: Promise<void> | undefined;
  let put: Promise<R2Object | null> | undefined;
  try {
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (length < 12) {
      const part = await reader.read();
      if (part.done) throw Error('Incomplete upload');
      chunks.push(part.value); length += part.value.length;
    }
    const { ext, type, mime } = sniffMedia(Buffer.concat(chunks).subarray(0, 12));
    const key = 'media/' + crypto.randomUUID() + ext;
    // Enforce the declared length while streaming large videos without buffering them.
    const stream = new FixedLengthStream(size);
    writer = stream.writable.getWriter() as unknown as WritableStreamDefaultWriter<Uint8Array>;
    const output = writer;
    pump = (async () => {
      for (const chunk of chunks) await output.write(chunk);
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        await output.write(part.value);
      }
      await output.close();
    })();
    put = storage.put(key, stream.readable, {
      httpMetadata: { contentType: mime, cacheControl: 'public, max-age=31536000, immutable' },
      onlyIf: { etagDoesNotMatch: '*' },
    });
    const [, saved] = await Promise.all([pump, put]);
    if (!saved) throw Error('Upload could not be stored. Please retry.');
    return { src: '/' + key, type, name };
  } catch (error) {
    await Promise.allSettled([reader.cancel(error), ...(writer ? [writer.abort(error)] : [])]);
    await Promise.allSettled([...(pump ? [pump] : []), ...(put ? [put] : [])]);
    throw error;
  } finally { reader.releaseLock(); }
}
export async function serveMedia(req: Request, { params }: { params: Promise<{ file: string }> }, head = false) {
  const { file } = await params;
  if (!/^[a-zA-Z0-9-]+\.(jpg|jpeg|png|gif|webp|mp4|webm)$/.test(file)) return new Response('Not found', { status: 404 });
  const key = 'media/' + file;
  const info = await bucket().head(key);
  if (!info) return new Response('Not found', { status: 404 });
  const headers = new Headers({
    'Content-Type': info.httpMetadata?.contentType || 'application/octet-stream',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Accept-Ranges': 'bytes', 'ETag': info.httpEtag, 'X-Content-Type-Options': 'nosniff',
  });
  if (req.headers.get('if-none-match') === info.httpEtag) return new Response(null, { status: 304, headers });
  let start = 0, end = info.size - 1, status = 200;
  const range = req.headers.get('range');
  if (range && (!req.headers.has('if-range') || req.headers.get('if-range') === info.httpEtag)) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range);
    const invalid = () => new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${info.size}` } });
    if (!m || (!m[1] && !m[2])) return invalid();
    if (m[1]) { start = Number(m[1]); end = m[2] ? Math.min(Number(m[2]), end) : end; }
    else { if (Number(m[2]) === 0) return invalid(); start = Math.max(0, info.size - Number(m[2])); }
    if (start > end || start >= info.size) return invalid();
    status = 206; headers.set('Content-Range', `bytes ${start}-${end}/${info.size}`);
  }
  headers.set('Content-Length', String(end - start + 1));
  if (head) return new Response(null, { status, headers });
  const object = await bucket().get(key, { range: { offset: start, length: end - start + 1 } });
  if (!object) return new Response('Not found', { status: 404 });
  return new Response(object.body as unknown as ReadableStream, { status, headers });
}
