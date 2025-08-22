/**
 * New clients will only be including this entry file, which will result in a reduced service worker size.
 */
if (import.meta.env.DEV) {
  import('../entries/logger.ts');
} else {
  self.importScripts(`${getPathAndPrefix()}OneSignalSDKLogger.js`);
}

import { getPathAndPrefix } from 'src/shared/helpers/script';
import { OneSignalServiceWorker } from '../sw/serviceWorker/ServiceWorker';

declare const self: ServiceWorkerGlobalScope;

self.OneSignalWorker = OneSignalServiceWorker;
