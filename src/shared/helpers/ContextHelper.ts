import { ServiceWorkerManager } from '../managers/ServiceWorkerManager';
import { PushSubscriptionManager, SubscriptionManagerConfig } from '../managers/PushSubscriptionManager';
import SdkEnvironment from '../managers/SdkEnvironment';
import { ContextSWInterface } from "../models/ContextSW";
import { AppConfig } from '../models/AppConfig';
import Path from '../models/Path';

export class ContextHelper {
  public static getServiceWorkerManager(context: ContextSWInterface): ServiceWorkerManager {
    const config: AppConfig = context.appConfig;

    const envPrefix = SdkEnvironment.getBuildEnvPrefix();
    const serviceWorkerManagerConfig = {
      workerPath: new Path(`/${envPrefix}OneSignalSDKWorker.js`),
      registrationOptions: { scope: '/' }
    };

    if (config.userConfig) {
      if (config.userConfig.path) {
        serviceWorkerManagerConfig.workerPath =
          new Path(`${config.userConfig.path}${config.userConfig.serviceWorkerPath}`);
      }
      if (config.userConfig.serviceWorkerParam) {
        serviceWorkerManagerConfig.registrationOptions = config.userConfig.serviceWorkerParam;
      }
    }
    return new ServiceWorkerManager(context, serviceWorkerManagerConfig);
  }

  public static getSubscriptionManager(context: ContextSWInterface): PushSubscriptionManager {
    const config: AppConfig = context.appConfig;
    const subscriptionManagerConfig: SubscriptionManagerConfig = {
      safariWebId: config.safariWebId,
      appId: config.appId,
      vapidPublicKey: config.vapidPublicKey,
      onesignalVapidPublicKey: config.onesignalVapidPublicKey,
    };
    return new PushSubscriptionManager(context, subscriptionManagerConfig);
  }
}

export default ContextHelper;
