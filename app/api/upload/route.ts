import { guard } from '@/lib/store';
import { uploadMedia } from '@/lib/media-runtime';
export async function POST(req: Request) {
  const denied = guard(req, true);
  if (denied) return denied;
  try {
    return Response.json(await uploadMedia(req), { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}
