import { guard, sessionToken } from '@/lib/store';
export async function POST(req: Request) {
  const denied = guard(req, true);
  if (denied) return denied;
  return Response.json(
    { ok: true },
    {
      headers: {
        'Set-Cookie': `vk_session=${sessionToken()}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${new URL(process.env.PUBLIC_ORIGIN || req.url).protocol === 'https:' ? '; Secure' : ''}`,
        'Cache-Control': 'no-store',
      },
    },
  );
}
export async function DELETE(req: Request) {
  const denied = guard(req, true);
  if (denied) return denied;
  return Response.json(
    { ok: true },
    {
      headers: {
        'Set-Cookie':
          'vk_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0',
        'Cache-Control': 'no-store',
      },
    },
  );
}
