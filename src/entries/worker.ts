import { ServiceWorker } from '../../src/service-worker/ServiceWorker';
//import { ServiceWorker } from '../service-worker/ServiceWorker';

(self as any).OneSignal = ServiceWorker;
