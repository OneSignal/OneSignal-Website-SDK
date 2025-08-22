import { defineConfig, LibraryOptions } from 'vite';
import { analyzer } from 'vite-bundle-analyzer';
import mkcert from 'vite-plugin-mkcert';
import tsconfigPaths from 'vite-tsconfig-paths';

type Lib = 'sdk' | 'page' | 'worker' | 'logger';

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
    name: 'OneSignal',
  },
  page: {
    entry: './src/entries/pageSdkInit.ts',
    fileName: () => `${prefix}OneSignalSDK.page.es6.js`,
    name: 'OneSignal',
  },
  worker: {
    entry: './src/entries/worker.ts',
    fileName: () => `${prefix}OneSignalSDK.sw.js`,
    name: 'OneSignal',
  },
  logger: {
    entry: './src/entries/logger.ts',
    fileName: () => `${prefix}OneSignalSDK.logger.js`,
    name: 'OneSignalLogger',
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
        mangle: {
          properties: {
            // Mangle / minify properties
            regex: /./,
            reserved: [
              // OneSignal methods
              'OneSignal',
              'login',
              'logout',
              'init',
              'setConsentGiven',
              'setConsentRequired',

              // general
              'addEventListener',
              'removeEventListener',

              // namesapces
              'Notifications',
              'setDefaultUrl',
              'isPushSupported',
              'requestPermission',
              'permissionNative',
              'permission',
              'setDefaultTitle',

              'Slidedown',
              'promptPush',
              'promptPushCategories',
              'promptSms',
              'promptEmail',
              'promptSmsAndEmail',

              'Debug',
              'setLogLevel',

              'Session',
              'sendOutcome',
              'sendUniqueOutcome',

              'User',
              'addAlias',
              'addAliases',
              'removeAlias',
              'removeAliases',
              'addEmail',
              'removeEmail',
              'addSms',
              'removeSms',
              'addTag',
              'addTags',
              'removeTag',
              'removeTags',
              'getTags',
              'setLanguage',
              'getLanguage',
              'onesignalId',
              'externalId',

              'PushSubscription',
              'optIn',
              'optOut',
              'id',
              'token',
              'optedIn',
            ],
          },
        },
      },

      lib: {
        ...libConfig[lib],
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
        treeshake: 'smallest',
      },
    },

    // Could move some of these to .env.[ENV] file
    // NOTE!!!: Since the service worker is registered separately, the define WONT probably replace it for the SW
    // But it will be fine for builds. So check if field exists for development e.g. typeof __VERSION__ !== 'undefined'
    define: {
      __API_TYPE__: JSON.stringify(process.env.API),
      __BUILD_TYPE__: JSON.stringify(process.env.ENV),
      __LOGGING__: JSON.stringify(getBooleanEnv(process.env.LOGGING)),
      __VERSION__: JSON.stringify(process.env.npm_package_config_sdkVersion),
      __IS_SERVICE_WORKER__: JSON.stringify(lib === 'worker'),

      // ignored for prod
      __API_ORIGIN__: JSON.stringify(process.env.API_ORIGIN),
      __BUILD_ORIGIN__: JSON.stringify(process.env.BUILD_ORIGIN),

      // dev only
      __IS_HTTPS__: JSON.stringify(getBooleanEnv(process.env.HTTPS)),
      __NO_DEV_PORT__: JSON.stringify(getBooleanEnv(process.env.NO_DEV_PORT)),
    },
    server: {
      open: true,
      port: 4000,
      https: {
        cert: './certs/cert.pem',
        key: './certs/dev.pem',
      },
    },
  };
});

const getBooleanEnv = (env?: string) => {
  return env && env === 'true';
};
