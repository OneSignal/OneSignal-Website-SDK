import type { AppConfig } from '../config/types';
import type { ContextInterface, ContextSWInterface } from '../context/types';
import { ServiceWorkerManager } from '../managers/ServiceWorkerManager';
import type { SubscriptionManagerConfig } from '../managers/subscription/base';
import { SubscriptionManagerPage } from '../managers/subscription/page';
import { SubscriptionManagerSW } from '../managers/subscription/sw';
import Path from '../models/Path';

export function getServiceWorkerManager(
  context: ContextInterface,
): ServiceWorkerManager {
  const config: AppConfig = context.appConfig;

  const serviceWorkerManagerConfig = {
    workerPath: new Path(`OneSignalSDKWorker.js`),
    registrationOptions: { scope: '/' },
  };

  if (config.userConfig) {
    if (config.userConfig.path) {
      serviceWorkerManagerConfig.workerPath = new Path(
        `${config.userConfig.path}${config.userConfig.serviceWorkerPath}`,
      );
    }
    if (config.userConfig.serviceWorkerParam) {
      serviceWorkerManagerConfig.registrationOptions =
        config.userConfig.serviceWorkerParam;
    }
  }
  return new ServiceWorkerManager(context, serviceWorkerManagerConfig);
}

function createSubscriptionManagerConfig(
  config: AppConfig,
): SubscriptionManagerConfig {
  return {
    safariWebId: config.safariWebId,
    appId: config.appId,
    vapidPublicKey: config.vapidPublicKey,
    onesignalVapidPublicKey: config.onesignalVapidPublicKey,
  };
}

export function getSubscriptionManagerPage(
  context: ContextInterface,
): SubscriptionManagerPage {
  return new SubscriptionManagerPage(
    context,
    createSubscriptionManagerConfig(context.appConfig),
  );
}

export function getSubscriptionManagerSW(
  context: ContextSWInterface,
): SubscriptionManagerSW {
  return new SubscriptionManagerSW(
    context,
    createSubscriptionManagerConfig(context.appConfig),
  );
}
