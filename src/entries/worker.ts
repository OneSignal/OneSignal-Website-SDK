/**
 * New clients will only be including this entry file, which will result in a reduced service worker size.
 */
import { ServiceWorker } from '../sw/serviceWorker/ServiceWorker';

(self as any).OneSignal = ServiceWorker;
