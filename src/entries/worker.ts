/**
 * New clients will only be including this entry file, which will result in a reduced service worker size.
 */
import "regenerator-runtime/runtime";
import { ServiceWorker } from '../../src/service-worker/ServiceWorker';

(self as any).OneSignal = ServiceWorker;
