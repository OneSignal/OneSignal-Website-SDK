import { defineConfig, LibraryOptions } from 'vite';
import { analyzer } from 'vite-bundle-analyzer';
import mkcert from 'vite-plugin-mkcert';

type Lib = 'sdk' | 'page' | 'worker';

const libConfig: Record<Lib, LibraryOptions> = {
  sdk: {
    entry: './src/entries/sdk.ts',
    fileName: () => 'OneSignalSDK.page.js',
  },
  page: {
    entry: './src/entries/pageSdkInit.ts',
    fileName: () => 'OneSignalSDK.page.es6.js',
  },
  worker: {
    entry: './src/entries/worker.ts',
    fileName: () => 'OneSignalSDK.sw.js',
  },
};

/**
 * Mode will be production if command is build otherwise it will be development
 * We'll use ENV var to target different environments e.g.
 * ENV=staging vite ...
 */
export default defineConfig(({ mode }) => {
  const isDevMode = mode === 'development';
  const lib = process.env.LIB as Lib;

  return {
    plugins: [
      mkcert(),
      ...(mode === 'production'
        ? [
            analyzer({
              analyzerMode: 'static',
              fileName: `../stats/${lib}-stats`,
            }),
          ]
        : []),
    ],
    build: {
      /**
       * NOTE: Need to specify 2022 or later to not have declarations like
       * `var It=Object.defineProperty;` above the IIFE.
       */
      target: 'es2022',
      minify: process.env.ENV === 'production',
      lib: {
        ...libConfig[lib],
        name: 'OneSignal',
        formats: ['iife'],
      },
      outDir: 'build/releases',
      emptyOutDir: false,
      sourcemap: true,
    },
    define: {
      __API_ORIGIN__: JSON.stringify(process.env.API_ORIGIN),
      __API_TYPE__: JSON.stringify(process.env.API),
      __BUILD_ORIGIN__: JSON.stringify(process.env.BUILD_ORIGIN),
      __BUILD_TYPE__: JSON.stringify(process.env.ENV),
      __IS_HTTPS__: JSON.stringify(true),
      __LOGGING__: JSON.stringify(isDevMode),
      __NO_DEV_PORT__: JSON.stringify(process.env.NO_DEV_PORT),
      __VERSION__: JSON.stringify(process.env.npm_package_config_sdkVersion),
    },
    server: {
      open: true,
      port: 4001,
      https: {
        cert: './certs/cert.pem',
        key: './certs/dev.pem',
      },
    },
  };
});
