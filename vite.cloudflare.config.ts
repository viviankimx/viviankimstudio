import { defineConfig } from 'vite';
import vinext from 'vinext';
import { cloudflare } from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/postcss';
import path from 'node:path';
export default defineConfig({
  plugins: [vinext(), cloudflare({ configPath: 'wrangler.cloudflare.jsonc', viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] } })],
  resolve: { alias: [
    { find: './storage.ts', replacement: path.resolve('lib/storage-appwrite.ts') },
    { find: '@/lib/media-runtime', replacement: path.resolve('lib/media-appwrite.ts') },
  ] },
  publicDir: '.cloudflare-public',
  css: { postcss: { plugins: [tailwindcss()] } },
});
