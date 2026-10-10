import { defineConfig, type Plugin } from 'vite';
import vinext from 'vinext';
import tailwindcss from '@tailwindcss/postcss';
import { execFile } from 'node:child_process';
import path from 'node:path';

// Dev only: reload the page when content/ changes, re-syncing media first if an
// image or video was added, replaced or removed.
function contentReload(): Plugin {
  let timer: NodeJS.Timeout | undefined;
  let media = false;
  return {
    name: 'content-reload',
    apply: 'serve',
    configureServer(server) {
      const dir = path.resolve('content');
      server.watcher.add(dir);
      const onChange = (file: string) => {
        if (!file.startsWith(dir)) return;
        if (!file.endsWith('.md')) media = true;
        clearTimeout(timer);
        timer = setTimeout(() => {
          const reload = () => server.ws.send({ type: 'full-reload' });
          if (!media) return reload();
          media = false;
          execFile(process.execPath, ['scripts/media.mjs'], (err, out, errOut) => {
            if (err) server.config.logger.error(errOut || String(err));
            else server.config.logger.info(out.trim());
            reload();
          });
        }, 300);
      };
      server.watcher.on('add', onChange);
      server.watcher.on('change', onChange);
      server.watcher.on('unlink', onChange);
    },
  };
}

export default defineConfig({
  plugins: [vinext(), contentReload()],
  css: { postcss: { plugins: [tailwindcss()] } },
  server: { host: '127.0.0.1' },
});
