// NOTE: We are using a function to get the value of the environment variable to make it easier to test.
// We also are using typeof check since defining global constants (through Vite) DOES NOT work for the service worker.
// ^ This only applies to development mode since we have separate bundles (entries) for the service worker and the main bundle.

// strings
export const API_TYPE =
  typeof __API_TYPE__ === 'undefined' ? 'production' : __API_TYPE__;

export const API_ORIGIN =
  typeof __API_ORIGIN__ === 'undefined' ? 'localhost' : __API_ORIGIN__;

export const BUILD_TYPE =
  typeof __BUILD_TYPE__ === 'undefined' ? 'production' : __BUILD_TYPE__;

export const BUILD_ORIGIN =
  typeof __BUILD_ORIGIN__ === 'undefined' ? 'localhost' : __BUILD_ORIGIN__;

export const VERSION = typeof __VERSION__ === 'undefined' ? '1' : __VERSION__;

// booleans
export const IS_HTTPS =
  typeof __IS_HTTPS__ === 'undefined' ? true : __IS_HTTPS__;

export const LOGGING = typeof __LOGGING__ === 'undefined' ? true : __LOGGING__;

export const NO_DEV_PORT =
  typeof __NO_DEV_PORT__ === 'undefined' ? false : __NO_DEV_PORT__;

// See note at the top. Defined globals wont work for service workers but will work for builds.
export const IS_SERVICE_WORKER =
  typeof __IS_SERVICE_WORKER__ === 'undefined'
    ? typeof self !== 'undefined' &&
      typeof ServiceWorkerGlobalScope !== 'undefined'
    : __IS_SERVICE_WORKER__;
