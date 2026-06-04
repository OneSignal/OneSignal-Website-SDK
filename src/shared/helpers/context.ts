import type { AppConfig } from '../config/types';
import { DEFAULT_SERVICE_WORKER_OPTIONS, DEFAULT_SERVICE_WORKER_PATH } from '../context/constants';
import type { ContextInterface, ContextSWInterface } from '../context/types';
import { ServiceWorkerManager } from '../managers/ServiceWorkerManager';
import type { SubscriptionManagerConfig } from '../managers/subscription/base';
import { SubscriptionManagerPage } from '../managers/subscription/page';
import { SubscriptionManagerSW } from '../managers/subscription/sw';
import Path from '../models/Path';

export function getServiceWorkerManager(context: ContextInterface): ServiceWorkerManager {
  const config: AppConfig = context._appConfig;

  const serviceWorkerManagerConfig = {
    workerPath: new Path(DEFAULT_SERVICE_WORKER_PATH),
    registrationOptions: DEFAULT_SERVICE_WORKER_OPTIONS,
  };

  if (config.userConfig) {
    if (config.userConfig.path) {
      // Join with exactly one slash. A leading "//" forms a protocol-relative
      // URL, which the browser resolves to a different origin and rejects with a
      // SecurityError when registering the worker.
      const basePath = config.userConfig.path.replace(/\/+$/, '');
      const workerPath = (config.userConfig.serviceWorkerPath ?? '').replace(/^\/+/, '');
      serviceWorkerManagerConfig.workerPath = new Path(`${basePath}/${workerPath}`);
    }
    if (config.userConfig.serviceWorkerParam) {
      serviceWorkerManagerConfig.registrationOptions = config.userConfig.serviceWorkerParam;
    }
  }
  return new ServiceWorkerManager(context, serviceWorkerManagerConfig);
}

function createSubscriptionManagerConfig(config: AppConfig): SubscriptionManagerConfig {
  return {
    safariWebId: config.safariWebId,
    appId: config.appId,
    vapidPublicKey: config.vapidPublicKey,
    onesignalVapidPublicKey: config.onesignalVapidPublicKey,
  };
}

export function getSubscriptionManagerPage(context: ContextInterface): SubscriptionManagerPage {
  return new SubscriptionManagerPage(context, createSubscriptionManagerConfig(context._appConfig));
}

export function getSubscriptionManagerSW(context: ContextSWInterface): SubscriptionManagerSW {
  return new SubscriptionManagerSW(context, createSubscriptionManagerConfig(context._appConfig));
}
