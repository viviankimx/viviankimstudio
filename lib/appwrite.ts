import { createHash } from 'node:crypto';
export function appwriteConfig() {
  const endpoint = process.env.APPWRITE_ENDPOINT?.replace(/\/$/, '');
  const project = process.env.APPWRITE_PROJECT_ID;
  const key = process.env.APPWRITE_API_KEY;
  if (!endpoint || !project || !key) throw Error('Appwrite storage is not configured');
  if (!/^https:\/\/[a-z0-9.-]+\.appwrite\.io\/v1$/.test(endpoint)) throw Error('Invalid Appwrite Cloud endpoint');
  return { endpoint, project, key };
}
export const mediaBucket = () => process.env.APPWRITE_MEDIA_BUCKET || 'studio-media';
export const contentBucket = () => process.env.APPWRITE_CONTENT_BUCKET || 'studio-content';
export const filesPath = (bucket: string) => `/storage/buckets/${encodeURIComponent(bucket)}/files`;
export const mediaId = (name: string) => createHash('sha256').update(name).digest('hex').slice(0, 32);
export class AppwriteError extends Error {
  status: number;
  constructor(status: number) {
    super(status === 409 ? 'Conflict: another editor saved changes. Reload before saving.' : status === 413 ? 'File exceeds the storage size limit.' : status === 429 ? 'Storage request limit reached. Please retry later.' : `Storage request failed (${status}).`);
    this.status = status;
  }
}
export async function appwriteFetch(path: string, init: RequestInit = {}) {
  const { endpoint, project, key } = appwriteConfig();
  const headers = new Headers(init.headers);
  headers.set('X-Appwrite-Project', project);
  headers.set('X-Appwrite-Key', key);
  const response = await fetch(endpoint + path, { ...init, headers, redirect: 'error', signal: init.signal || AbortSignal.timeout(60_000) });
  if (!response.ok) { await response.body?.cancel(); throw new AppwriteError(response.status); }
  return response;
}
export async function createFile(bucket: string, id: string, name: string, bytes: Uint8Array, mime: string, offset = 0, total = bytes.length) {
  const form = new FormData();
  form.set('fileId', id);
  form.set('file', new Blob([bytes as BlobPart], { type: mime }), name);
  const headers: Record<string,string> = {};
  if (total > 5_000_000) {
    headers['Content-Range'] = `bytes ${offset}-${offset + bytes.length - 1}/${total}`;
    if (offset) headers['X-Appwrite-ID'] = id;
  }
  const res = await appwriteFetch(filesPath(bucket), { method: 'POST', headers, body: form });
  return res.json();
}
