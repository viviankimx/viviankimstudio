import { serveMedia } from '@/lib/media-runtime';
export const GET = (req: Request, ctx: any) => serveMedia(req, ctx);
export const HEAD = (req: Request, ctx: any) => serveMedia(req, ctx, true);
