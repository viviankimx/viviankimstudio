import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMarkdown, parseProject, sections, embedUrl, getSite } from '../lib/content.ts';

test('frontmatter and sections', () => {
  const { data, body } = parseMarkdown('---\ntitle: A: B\n---\n\n## Hero\n\nHello\n\n## Clients\n\n- X\n');
  assert.equal(data.title, 'A: B');
  assert.deepEqual(sections(body), { hero: 'Hello', clients: '- X' });
});

test('project body: images, videos, embeds and description', () => {
  const p = parseProject(
    'demo',
    '---\ntitle: T\nsubtitle: S\n---\n\nShot in Tulum.\n\n![Beach](01.jpg)\n![](clip.mp4)\nhttps://vimeo.com/123\n',
    'stills',
  );
  assert.equal(p.description, 'Shot in Tulum.');
  assert.equal(p.cover, '01.jpg');
  assert.deepEqual(p.blocks.map((b) => [b.type, b.src, b.caption]), [
    ['image', '01.jpg', 'Beach'],
    ['video', 'clip.mp4', ''],
    ['embed', 'https://player.vimeo.com/video/123', ''],
  ]);
});

test('embed links normalize to player URLs', () => {
  assert.equal(embedUrl('https://www.youtube.com/watch?v=abc'), 'https://www.youtube.com/embed/abc');
  assert.equal(embedUrl('https://youtu.be/abc'), 'https://www.youtube.com/embed/abc');
  assert.equal(embedUrl('https://example.com/x'), null);
});

test('repository content loads and every referenced file exists', () => {
  const s = getSite();
  assert.ok(s.featured.length > 0 && s.stills.length > 0 && s.motion.length > 0);
  assert.ok(s.memories.items.length > 0);
  for (const p of Object.values(s.projects)) assert.ok(p.cover, `${p.slug} has a cover`);
});

test('embed lines can carry the film size', () => {
  const p = parseProject('demo', '---\ntitle: T\n---\n\nhttps://vimeo.com/123 1080x1920\nhttps://youtu.be/abc\n', 'motion');
  assert.deepEqual(p.blocks.map((b) => b.ratio), ['1080 / 1920', undefined]);
});
