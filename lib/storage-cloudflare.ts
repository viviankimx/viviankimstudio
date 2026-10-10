import { env } from 'cloudflare:workers';
import { readR2Content, saveR2Content } from './storage-r2.ts';
export const dataDir = 'R2:content/';
export function bucket(): R2Bucket {
  const value = (env as unknown as { STUDIO_BUCKET?: R2Bucket }).STUDIO_BUCKET;
  if (!value) throw Error('CMS storage is not configured');
  return value;
}
export const readContent = () => readR2Content(bucket());
export const persistContent = (content: any) => saveR2Content(bucket(), content);
