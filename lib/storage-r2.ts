const key = 'content/content.json';
const conflict = () => Error('Conflict: another editor saved changes. Reload before saving.');
export async function readR2Content(bucket: R2Bucket) {
  const object = await bucket.get(key);
  if (!object) throw Error('CMS content has not been migrated');
  return object.json();
}
export async function saveR2Content(bucket: R2Bucket, content: any) {
  const object = await bucket.get(key);
  if (!object) throw Error('CMS content has not been migrated');
  const old: any = await object.json();
  if (content.revision !== old.revision) throw conflict();
  // Keep a recoverable snapshot before attempting the conditional replacement.
  await bucket.put(`backups/${old.revision}-${object.etag}.json`, JSON.stringify(old), {
    onlyIf: { etagDoesNotMatch: '*' },
    httpMetadata: { contentType: 'application/json' },
  });
  const next = { ...content, revision: old.revision + 1 };
  const saved = await bucket.put(key, JSON.stringify(next), {
    onlyIf: { etagMatches: object.etag },
    httpMetadata: { contentType: 'application/json', cacheControl: 'no-store' },
  });
  if (!saved) throw conflict();
  return next;
}
