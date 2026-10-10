import { mkdir, cp } from 'node:fs/promises';
await mkdir('.cloudflare-public', { recursive: true });
await cp('public/fonts', '.cloudflare-public/fonts', { recursive: true });
await cp('public/favicon.svg', '.cloudflare-public/favicon.svg');
