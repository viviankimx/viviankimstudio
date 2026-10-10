import { defineConfig } from 'vite';
import vinext from 'vinext';
import tailwindcss from '@tailwindcss/postcss';
// Local, portable Node runtime: content and media live in this repository folder.
export default defineConfig({
  plugins: [vinext()],
  css: { postcss: { plugins: [tailwindcss()] } },
  server: { host: '127.0.0.1', watch: { usePolling: true } },
});
