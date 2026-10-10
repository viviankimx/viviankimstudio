import { authorized } from './lib/store';
export function middleware(req: Request) {
  const p = new URL(req.url).pathname;
  if ((p === '/admin' || p.startsWith('/admin/')) && !authorized(req))
    return new Response('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate':
          'Basic realm="Vivian Kim Studio CMS", charset="UTF-8"',
        'Cache-Control': 'no-store',
      },
    });
}
export const config = { matcher: ['/admin/:path*'] };
