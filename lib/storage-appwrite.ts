import { appwriteFetch, createFile, contentBucket, filesPath } from './appwrite.ts';
export const dataDir = 'Appwrite:studio-content';
export function revisionId(revision: number) {
  if (!Number.isSafeInteger(revision) || revision < 0) throw Error('Invalid content revision');
  return 'revision-' + String(revision).padStart(16, '0');
}
export async function readContent() {
  const query = new URLSearchParams();
  query.append('queries[]', JSON.stringify({ method: 'orderDesc', attribute: '$id' }));
  query.append('queries[]', JSON.stringify({ method: 'limit', values: [1] }));
  const listing = await (await appwriteFetch(filesPath(contentBucket()) + '?' + query)).json() as any;
  const file = listing.files?.[0];
  if (!file || !/^revision-\d{16}$/.test(file.$id)) throw Error('CMS content has not been migrated');
  return (await appwriteFetch(`${filesPath(contentBucket())}/${file.$id}/download`)).json();
}
export async function persistContent(content: any) {
  const old: any = await readContent();
  if (old.revision !== content.revision) throw Error('Conflict: another editor saved changes. Reload before saving.');
  const next = { ...content, revision: old.revision + 1 };
  const bytes = new TextEncoder().encode(JSON.stringify(next));
  // One request per immutable revision: duplicate IDs reject competing saves atomically.
  // Previous revisions stay available as backups, and cannot be overwritten by a redeploy.
  if (bytes.length > 4_000_000) throw Error('CMS content exceeds the 4 MB save limit.');
  const id = revisionId(next.revision);
  await createFile(contentBucket(), id, id + '.json', bytes, 'application/json');
  return next;
}
