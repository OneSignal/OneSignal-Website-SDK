import fs from 'node:fs';
import path from 'node:path';

import { defineConfig } from 'vite-plus';

const SDK_FILES_DIR = path.resolve(import.meta.dirname, '../build/releases');
const CERT_PATH = path.resolve(import.meta.dirname, 'certs/dev-ssl.crt');
const KEY_PATH = path.resolve(import.meta.dirname, 'certs/dev-ssl.key');

const useHttps = process.env.HTTPS !== 'false';
const httpsOptions =
  useHttps && fs.existsSync(CERT_PATH) && fs.existsSync(KEY_PATH)
    ? { cert: fs.readFileSync(CERT_PATH), key: fs.readFileSync(KEY_PATH) }
    : undefined;

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
    port: useHttps ? 4001 : 4002,
    strictPort: true,
    https: httpsOptions,
  },
  plugins: [
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
          const filePath = path.join(SDK_FILES_DIR, requestedFile);
          if (!filePath.startsWith(SDK_FILES_DIR + path.sep) || !fs.existsSync(filePath)) {
            next();
            return;
          }
          const contentType = contentTypeFor(requestedFile);
          if (contentType) {
            res.setHeader('Content-Type', contentType);
          }
          fs.createReadStream(filePath).pipe(res);
        });
      },
    },
  ],
});
