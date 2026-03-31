import { readFileSync } from 'node:fs';
import path from 'path';

import { analyzer } from 'vite-bundle-analyzer';
import mkcert from 'vite-plugin-mkcert';
import { defineConfig, type LibraryOptions } from 'vite-plus';

const {
  config: { sdkVersion },
} = JSON.parse(readFileSync(path.resolve(import.meta.dirname, 'package.json'), 'utf-8'));

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

const getBooleanEnv = (env?: string) => {
  return env && env === 'true';
};

const isProdEnv = process.env.ENV === 'production';
const isTest = !!process.env.VITEST;
const isBuild = process.env.NODE_ENV === 'production';
const lib = process.env.LIB as Lib;

export default defineConfig({
  staged: {
    '*': 'vp check --fix',
  },
  fmt: {
    singleQuote: true,
    sortImports: {
      enabled: true,
    },
  },
  lint: {
    rules: {
      'typescript/require-await': 'error',
    },
    options: { typeAware: true, typeCheck: true },
  },
  resolve: {
    tsconfigPaths: true,
    alias: isTest
      ? {
          src: path.resolve(import.meta.dirname, 'src'),
          __test__: path.resolve(import.meta.dirname, '__test__'),
        }
      : undefined,
  },
  plugins: [
    mkcert(),
    ...(isBuild
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
    minify: isProdEnv ? 'terser' : false,
    terserOptions: {
      compress: {
        passes: 2,
      },
      mangle: {
        properties: {
          // Enable property name mangling/minification for private-style properties (starting with _)
          regex: /^_/,
          keep_quoted: true,
        },
      },
    },

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

      // for getting rid of unused imports for builds otherwise we would need dynamic imports
      treeshake: { moduleSideEffects: false },
    },
  },

  // Could move some of these to .env.[ENV] file
  // NOTE!!!: Since the service worker is registered separately, the define WONT probably replace it for the SW
  // But it will be fine for builds. So check if field exists for development e.g. typeof __VERSION__ !== 'undefined'
  define: isTest
    ? {
        __API_ORIGIN__: JSON.stringify('onesignal.com'),
        __API_TYPE__: JSON.stringify('staging'),
        __BUILD_ORIGIN__: JSON.stringify('onesignal.com'),
        __BUILD_TYPE__: JSON.stringify('production'),
        __IS_HTTPS__: JSON.stringify(true),
        __LOGGING__: JSON.stringify(false),
        __NO_DEV_PORT__: JSON.stringify(true),
        __VERSION__: JSON.stringify('160000'),
      }
    : {
        __API_TYPE__: JSON.stringify(process.env.API),
        __BUILD_TYPE__: JSON.stringify(process.env.ENV),
        __LOGGING__: JSON.stringify(getBooleanEnv(process.env.LOGGING) ?? !isProdEnv),
        __VERSION__: JSON.stringify(sdkVersion),
        __IS_SERVICE_WORKER__: JSON.stringify(lib === 'worker'),
        __API_ORIGIN__: JSON.stringify(process.env.API_ORIGIN),
        __BUILD_ORIGIN__: JSON.stringify(process.env.BUILD_ORIGIN),
        __IS_HTTPS__: JSON.stringify(getBooleanEnv(process.env.HTTPS)),
        __NO_DEV_PORT__: JSON.stringify(getBooleanEnv(process.env.NO_DEV_PORT)),
      },
  server: {
    open: true,
    port: 4000,
    https:
      getBooleanEnv(process.env.HTTPS) === false
        ? {}
        : { cert: './certs/cert.pem', key: './certs/dev.pem' },
  },
  test: {
    clearMocks: true,
    coverage: {
      include: ['src/**'],
      reporter: ['text-summary', 'lcov'],
      reportsDirectory: 'coverage',
      reportOnFailure: true,
      thresholds: {
        statements: 75,
        branches: 63,
        functions: 81,
        lines: 75,
      },
    },
    environment: 'jsdom',
    include: ['src/**/*.test.ts', '__test__/**/*.test.ts'],
    setupFiles: ['fake-indexeddb/auto', './__test__/setupTests.ts'],
  },
});
