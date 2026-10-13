// Serves the static build in dist/client the way Vercel does (clean URLs, 404.html).
import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('dist/client');
const port = Number(process.argv[2]) || 3000;
const types = {
  '.html': 'text/html; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.js': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.otf': 'font/otf',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif',
  '.webp': 'image/webp', '.avif': 'image/avif', '.mp4': 'video/mp4', '.webm': 'video/webm',
};
const isFile = (f) => stat(f).then((s) => s.isFile() && s, () => null);

http
  .createServer(async (req, res) => {
    const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const base = path.join(root, path.normalize(url).replace(/^(\.\.[/\\])+/, ''));
    let file = base, info, status = 200;
    for (const f of [base, base + '.html', path.join(base, 'index.html')])
      if ((info = await isFile(f))) { file = f; break; }
    if (!info) { file = path.join(root, '404.html'); info = await isFile(file); status = 404; }
    const headers = { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Accept-Ranges': 'bytes' };
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    let start = 0, end = info.size - 1;
    if (range && status === 200) {
      if (range[1]) { start = +range[1]; if (range[2]) end = Math.min(+range[2], end); }
      else start = Math.max(0, info.size - +range[2]);
      status = 206;
      headers['Content-Range'] = `bytes ${start}-${end}/${info.size}`;
    }
    headers['Content-Length'] = end - start + 1;
    res.writeHead(status, headers);
    if (req.method === 'HEAD') return res.end();
    createReadStream(file, { start, end }).pipe(res);
  })
  .listen(port, '127.0.0.1', () => console.log(`Static preview: http://127.0.0.1:${port}`));
