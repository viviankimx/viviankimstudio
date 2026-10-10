import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, copyFile, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const temp = await mkdtemp(path.join(os.tmpdir(), 'vk-test-'));
process.env.DATA_DIR = temp;
process.env.CMS_USERNAME = 'admin';
process.env.CMS_PASSWORD = 'test-only-password';
await copyFile('data/seed.json', path.join(temp, 'content.json'));
const {
  readContent,
  saveContent,
  guard,
  publicContent,
  validate,
  limitedBody,
  sessionToken,
} = await import('../lib/store.ts');
const auth =
  'Basic ' + Buffer.from('admin:test-only-password').toString('base64');
after(() => rm(temp, { recursive: true, force: true }));
test('Basic auth, cookie integrity and mutation origin boundaries', () => {
  assert.equal(guard(new Request('http://localhost/api/content'))?.status, 401);
  assert.equal(
    guard(
      new Request('http://localhost/api/content', {
        headers: { Authorization: auth },
      }),
    ),
    null,
  );
  assert.equal(
    guard(
      new Request('http://localhost/api/content', {
        headers: { Authorization: auth, Origin: 'https://other.example' },
      }),
      true,
    )?.status,
    403,
  );
  const token = sessionToken();
  assert.equal(
    guard(
      new Request('http://localhost/api/content', {
        headers: { Cookie: 'vk_session=' + token },
      }),
    ),
    null,
  );
  assert.equal(
    guard(
      new Request('http://localhost/api/content', {
        headers: { Cookie: 'vk_session=' + token.slice(0, -1) + 'z' },
      }),
    )?.status,
    401,
  );
});
test('Atomic persisted save, optimistic conflicts, backup and restart readability', async () => {
  const c = await readContent();
  const revision = c.revision;
  c.hero.copy = 'Changed by isolated test';
  const next = await saveContent(c);
  assert.equal(next.revision, revision + 1);
  assert.equal(
    JSON.parse(await readFile(path.join(temp, 'content.json'), 'utf8')).hero
      .copy,
    c.hero.copy,
  );
  await assert.rejects(saveContent(c), /Conflict/);
  assert.equal((await readdir(path.join(temp, 'backups'))).length, 1);
});
test('Public projection never contains unpublished projects or draft URLs', async () => {
  const c = await readContent();
  c.projects[0].published = false;
  c.projects[0].description = 'PRIVATE-DRAFT-MARKER';
  const projection = publicContent(c);
  assert.ok(!JSON.stringify(projection).includes('PRIVATE-DRAFT-MARKER'));
  assert.ok(!projection.orders.featured.includes(c.projects[0].id));
});
test('Reject unsafe URLs, duplicate slugs and malformed gallery data', async () => {
  const c = await readContent();
  validate(c);
  const bad = structuredClone(c);
  bad.navigation[0].href = 'javascript:alert(1)';
  assert.throws(() => validate(bad));
  const dup = structuredClone(c);
  dup.projects[1].slug = dup.projects[0].slug;
  assert.throws(() => validate(dup));
  const gallery = structuredClone(c);
  gallery.memories.items[0].height = 0;
  assert.throws(() => validate(gallery));
});
test('Bounded body refuses excess payload', async () => {
  await assert.rejects(
    limitedBody(
      new Request('http://localhost', { method: 'POST', body: 'too large' }),
      3,
    ),
    /size limit/,
  );
});
test('All imported local media paths exist', async () => {
  const c = JSON.parse(await readFile('data/seed.json', 'utf8'));
  const paths = [
    c.hero.video,
    c.hero.poster,
    ...c.projects.flatMap((p: any) => [
      p.cover,
      ...p.blocks.filter((b: any) => b.type === 'image').map((b: any) => b.src),
    ]),
    ...c.memories.items.map((i: any) => i.src),
  ];
  for (const src of new Set(paths)) {
    assert.ok(src.startsWith('/media/'));
    assert.ok((await readFile(path.join('public', src))).length > 0);
  }
});

test('Public routes send only their own published content in canonical order', async () => {
  const c = await readContent();
  c.projects[0].published = false;
  const home = publicContent(c, '');
  assert.equal(home.memories, undefined);
  assert.ok(home.projects.every((p: any) => p.blocks.length === 0));
  assert.deepEqual(
    home.projects.map((p: any) => p.id),
    c.projects.filter((p: any) => p.published).map((p: any) => p.id),
  );
  const motion = publicContent(c, 'motion');
  assert.ok(motion.projects.every((p: any) => p.categories.includes('motion')));
  assert.equal(motion.hero, undefined);
  const project = c.projects.find((p: any) => p.published && p.blocks.length);
  const detail = publicContent(c, 'project/' + project.slug);
  assert.equal(detail.projects.length, 1);
  assert.equal(detail.projects[0].blocks.length, project.blocks.length);
  const memories = publicContent(c, 'memories');
  assert.equal(memories.projects.length, 0);
  assert.equal(memories.memories.items.length, c.memories.items.length);
});
