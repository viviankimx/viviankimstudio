import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readContent, persistContent, revisionId } from '../lib/storage-appwrite.ts';
import { mediaId } from '../lib/appwrite.ts';
process.env.APPWRITE_ENDPOINT = 'https://test.cloud.appwrite.io/v1';
process.env.APPWRITE_PROJECT_ID = 'test';
process.env.APPWRITE_API_KEY = 'test-only';
test('Immutable Appwrite revisions reject competing saves and retain old content', async () => {
  const original = globalThis.fetch;
  const files = new Map([[revisionId(1), { revision: 1, hero: 'original' }]]);
  globalThis.fetch = (async (input: any, init: any = {}) => {
    const url = new URL(String(input));
    if (init.method === 'POST') {
      const form = init.body as FormData;
      const id = String(form.get('fileId'));
      const value = JSON.parse(await (form.get('file') as Blob).text());
      if (files.has(id)) return new Response(null, { status: 409 });
      files.set(id, value); return Response.json({ $id: id }, { status: 201 });
    }
    if (url.pathname.endsWith('/download')) return Response.json(files.get(url.pathname.split('/').at(-2)!));
    const id = [...files.keys()].sort().at(-1);
    return Response.json({ files: [{ $id: id }] });
  }) as typeof fetch;
  try {
    const first = await readContent();
    const results = await Promise.allSettled([persistContent({ ...first, hero: 'one' }), persistContent({ ...first, hero: 'two' })]);
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(results.filter(r => r.status === 'rejected').length, 1);
    assert.equal((await readContent()).revision, 2);
    assert.equal(files.get(revisionId(1))?.hero, 'original');
    await assert.rejects(persistContent(first), /Conflict/);
  } finally { globalThis.fetch = original; }
});
test('Stable media IDs fit Appwrite limits; revision ordering is numeric', () => {
  assert.equal(mediaId('image.jpg').length, 32);
  assert.equal(mediaId('image.jpg'), mediaId('image.jpg'));
  assert.notEqual(mediaId('image.jpg'), mediaId('image.webp'));
  assert.ok(revisionId(10) > revisionId(9));
  assert.throws(() => revisionId(-1));
});
