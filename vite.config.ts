import { defineConfig, LibraryOptions } from 'vite';
import { analyzer } from 'vite-bundle-analyzer';
import mkcert from 'vite-plugin-mkcert';
import tsconfigPaths from 'vite-tsconfig-paths';
import cssSourceMap from './build/plugins/cssSourceMap';

type Lib = 'sdk' | 'page' | 'worker';

let prefix: string;
switch (process.env.ENV) {
  case 'production':
    prefix = '';
    break;
  case 'staging':
    prefix = 'Staging-';
    break;
  default:
    prefix = 'Dev-';
}

const libConfig: Record<Lib, LibraryOptions> = {
  sdk: {
    entry: './src/entries/sdk.ts',
    fileName: () => `${prefix}OneSignalSDK.page.js`,
  },
  page: {
    entry: './src/entries/pageSdkInit.ts',
    fileName: () => `${prefix}OneSignalSDK.page.es6.js`,
  },
  worker: {
    entry: './src/entries/worker.ts',
    fileName: () => `${prefix}OneSignalSDK.sw.js`,
  },
};

/**
 * Mode will be production if command is build otherwise it will be development
 * We'll use ENV var to target different environments e.g.
 * ENV=staging vite ...
 */
export default defineConfig(({ mode }) => {
  const isProdEnv = process.env.ENV === 'production';
  const lib = process.env.LIB as Lib;

  return {
    plugins: [
      tsconfigPaths(),
      mkcert(),
      ...(mode === 'production'
        ? [
            analyzer({
              analyzerMode: 'static',
              fileName: `../stats/${lib}-stats`,
            }),
            cssSourceMap(),
          ]
        : []),
    ],
    build: {
      /**
       * NOTE: Need to specify 2022 or later to not have declarations like
       * `var It=Object.defineProperty;` above the IIFE.
       */
      target: 'es2022',
      cssTarget: 'esnext',
      minify: isProdEnv,
      lib: {
        ...libConfig[lib],
        name: 'OneSignal',
        formats: ['iife'],
      },
      outDir: 'build/releases',
      emptyOutDir: false,
      sourcemap: true,

      rollupOptions: {
        output: {
          assetFileNames: `${prefix}OneSignalSDK.page.styles.css`,
        },
      },
    },

    // Could move some of these to .env.[ENV] file
    define: {
      __API_TYPE__: JSON.stringify(process.env.API || 'production'),
      __BUILD_TYPE__: JSON.stringify(process.env.ENV || 'production'),
      __LOGGING__: JSON.stringify(!isProdEnv),
      __VERSION__: JSON.stringify(process.env.npm_package_config_sdkVersion),

      // ignored for prod
      __API_ORIGIN__: JSON.stringify(process.env.API_ORIGIN || 'localhost'),
      __BUILD_ORIGIN__: JSON.stringify(process.env.BUILD_ORIGIN || 'localhost'),

      // dev only
      __IS_HTTPS__: JSON.stringify(process.env.HTTPS ?? true),
      __NO_DEV_PORT__: JSON.stringify(process.env.NO_DEV_PORT ?? false),
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
