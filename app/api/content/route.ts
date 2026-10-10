import { guard, readContent, saveContent, limitedBody } from '@/lib/store';
export async function GET(req: Request) {
  const denied = guard(req);
  if (denied) return denied;
  return Response.json(await readContent(), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
export async function PUT(req: Request) {
  const denied = guard(req, true);
  if (denied) return denied;
  try {
    return Response.json(
      await saveContent(
        JSON.parse((await limitedBody(req, 8 * 1024 * 1024)).toString()),
      ),
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e: any) {
    return Response.json(
      { error: e.message },
      { status: e.message.startsWith('Conflict') ? 409 : 400 },
    );
  }
}
