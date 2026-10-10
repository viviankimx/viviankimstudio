import { stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import path from 'node:path';
const types: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};
export async function serveMedia(
  req: Request,
  { params }: { params: Promise<{ file: string }> },
  head = false,
) {
  const { file } = await params;
  if (!/^[a-zA-Z0-9-]+\.(jpg|jpeg|png|gif|webp|mp4|webm)$/.test(file))
    return new Response('Not found', { status: 404 });
  const filename = path.resolve('public/media', file);
  let info;
  try {
    info = await stat(filename);
  } catch {
    return new Response('Not found', { status: 404 });
  }
  const headers: Record<string, string> = {
    'Content-Type': types[path.extname(file)],
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
  };
  let start = 0,
    end = info.size - 1,
    status = 200;
  const range = req.headers.get('range');
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!m || (!m[1] && !m[2]))
      return new Response(null, {
        status: 416,
        headers: { 'Content-Range': `bytes */${info.size}` },
      });
    if (m[1]) {
      start = Number(m[1]);
      end = m[2] ? Math.min(Number(m[2]), end) : end;
    } else {
      start = Math.max(0, info.size - Number(m[2]));
    }
    if (start > end || start >= info.size)
      return new Response(null, {
        status: 416,
        headers: { 'Content-Range': `bytes */${info.size}` },
      });
    status = 206;
    headers['Content-Range'] = `bytes ${start}-${end}/${info.size}`;
  }
  headers['Content-Length'] = String(end - start + 1);
  return new Response(
    head
      ? null
      : (Readable.toWeb(
          createReadStream(filename, { start, end }),
        ) as ReadableStream),
    { status, headers },
  );
}

export async function uploadMedia(req: Request) {
  const { limitedBody } = await import('./store.ts');
  const { mkdir, writeFile } = await import('node:fs/promises');
  const { randomUUID } = await import('node:crypto');
  const { sniffMedia } = await import('./media-type.ts');
  let bytes = await limitedBody(req, 100 * 1024 * 1024);
  let originalName = decodeURIComponent(req.headers.get('x-file-name') || 'upload');
  if (req.headers.get('content-type')?.startsWith('multipart/form-data')) {
    const form = await new Response(bytes, { headers: { 'Content-Type': req.headers.get('content-type')! } }).formData();
    const file = form.get('file');
    if (!(file instanceof File)) throw Error('Choose a file');
    bytes = Buffer.from(await file.arrayBuffer());
    originalName = file.name;
  }
  const { ext, type } = sniffMedia(bytes);
  const name = randomUUID() + ext;
  await mkdir('public/media', { recursive: true });
  await writeFile(path.join('public/media', name), bytes, { flag: 'wx' });
  return { src: '/media/' + name, type, name: originalName };
}
