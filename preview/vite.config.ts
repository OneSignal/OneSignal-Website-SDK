import fs from 'node:fs';
import path from 'node:path';

import mkcert from 'vite-plugin-mkcert';
import { defineConfig } from 'vite-plus';

const SDK_FILES_DIR = path.resolve(import.meta.dirname, '../build/releases');

// Maps `SDK_ENV` to the filename prefix that `vite.config.ts` at the repo
// root applies based on `ENV`. Lets the sandbox load whichever flavor of
// build is on disk without editing `index.html` or `OneSignalSDKWorker.js`.
const SDK_PREFIX_BY_ENV: Record<string, string> = {
  dev: 'Dev-',
  staging: 'Staging-',
  production: '',
};
const sdkEnv = process.env.SDK_ENV ?? 'production';
if (!Object.hasOwn(SDK_PREFIX_BY_ENV, sdkEnv)) {
  // Fail at server startup so a typo like `SDK_ENV=devv` doesn't silently
  // serve unprefixed filenames and produce opaque 404s for dev/staging
  // builds. Mirrors `start.sh`'s validation for direct `vp dev` callers.
  throw new Error(
    `Unknown SDK_ENV='${sdkEnv}'. Expected one of: ${Object.keys(SDK_PREFIX_BY_ENV).join(', ')}.`,
  );
}
const desiredPrefix = SDK_PREFIX_BY_ENV[sdkEnv];

const useHttps = process.env.HTTPS !== 'false';

const contentTypeFor = (file: string) => {
  if (file.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  if (file.endsWith('.map')) return 'application/json; charset=utf-8';
  return undefined;
};

export default defineConfig({
  root: import.meta.dirname,
  publicDir: false,
  server: {
    host: true,
    // Ports must match `src/page/utils/shimLoader.ts` so the shim's hardcoded
    // SDK fetch URL (e.g. `http://localhost:4000/...` in HTTP mode) lands here.
    port: useHttps ? 4001 : 4000,
    strictPort: true,
    // HMR's WebSocket targets `wss://localhost:<port>`, which iOS devices on a
    // tunnel (ngrok, etc.) can't reach. Disabling stops the runaway
    // reconnect loop that floods the console with `ws.send` rejections.
    hmr: false,
  },
  plugins: [
    {
      // Vite's dev server injects `<script src="/@vite/client">` into every
      // HTML response, even when `server.hmr` is false. That client then
      // retries a WebSocket forever, which on a tunneled iOS device floods
      // the console with `ws.send` rejections and is heavy enough to
      // skew our SDK timing. Strip it out for the preview server, where
      // we don't need HMR.
      name: 'strip-vite-client',
      enforce: 'post',
      transformIndexHtml(html) {
        return html.replace(/<script[^>]*src="\/@vite\/client"[^>]*><\/script>\s*/g, '');
      },
    },
    ...(useHttps
      ? [
          mkcert({
            hosts: [
              'localhost',
              '127.0.0.1',
              'texas',
              'california',
              'oregon',
              'washington',
              'washington.ubuntu',
              'washington.california',
              'washington.localhost',
            ],
          }),
        ]
      : []),
    {
      // Maps `/sdks/web/v16/<file>` to the SDK build output at `../build/releases/<file>`,
      // mirroring how OneSignal's CDN serves SDK assets.
      name: 'serve-sdk-releases',
      configureServer(server) {
        server.middlewares.use('/sdks/web/v16', (req, res, next) => {
          const rawUrl = req.url ?? '/';
          const requestedFile = path.basename(rawUrl.split('?')[0]);
          if (!requestedFile) {
            next();
            return;
          }
          // Rewrite any `Dev-` / `Staging-` / unprefixed request to whichever
          // prefix matches the current SDK_ENV, so the same `index.html` works
          // against dev, staging, and prod SDK builds without edits.
          const rewrittenFile = requestedFile.replace(/^(?:Dev-|Staging-)?/, desiredPrefix);
          const filePath = path.join(SDK_FILES_DIR, rewrittenFile);
          if (!filePath.startsWith(SDK_FILES_DIR + path.sep) || !fs.existsSync(filePath)) {
            next();
            return;
          }
          const contentType = contentTypeFor(rewrittenFile);
          if (contentType) {
            res.setHeader('Content-Type', contentType);
          }
          // Avoid stale SDK bundles being served from the browser HTTP cache,
          // which is especially aggressive on iOS Safari/PWA. Without this,
          // rebuilding the SDK during a debug session won't take effect on the
          // device until you fully wipe website data.
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          fs.createReadStream(filePath).pipe(res);
        });
      },
    },
    {
      // Same hygiene for the sandbox HTML (pageA/pageB/index) and root SW
      // file. Vite's default dev-server cache policy is fine for source files
      // but our HTML directly references the SDK and embeds repro state.
      name: 'no-store-html',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url ?? '';
          if (/\.(html|json|js)(\?|$)/.test(url) && !url.startsWith('/sdks/')) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
          }
          next();
        });
      },
    },
  ],
});
