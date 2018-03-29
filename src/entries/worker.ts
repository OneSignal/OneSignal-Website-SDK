"use runtime-nodent";
import { ServiceWorker } from '../../src/service-worker/ServiceWorker';

(self as any).OneSignal = ServiceWorker;
