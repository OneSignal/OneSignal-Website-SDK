import { ServiceWorkerManager } from '../managers/ServiceWorkerManager';
import { SubscriptionManager, SubscriptionManagerConfig } from '../managers/SubscriptionManager';
import SdkEnvironment from '../managers/SdkEnvironment';
import { ContextSWInterface } from "../models/ContextSW";
import { AppConfig } from '../models/AppConfig';
import Path from '../models/Path';

export class ContextHelper {
  public static getServiceWorkerManager(context: ContextSWInterface): ServiceWorkerManager {
    const config: AppConfig = context.appConfig;

    const envPrefix = SdkEnvironment.getBuildEnvPrefix();
    const serviceWorkerManagerConfig = {
      workerPath: new Path(`/${envPrefix}OneSignalSDK.sw.js`),
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

  public static getSubscriptionManager(context: ContextSWInterface): SubscriptionManager {
    const config: AppConfig = context.appConfig;
    const subscriptionManagerConfig: SubscriptionManagerConfig = {
      safariWebId: config.safariWebId,
      appId: config.appId,
      vapidPublicKey: config.vapidPublicKey,
      onesignalVapidPublicKey: config.onesignalVapidPublicKey,
    };
    return new SubscriptionManager(context, subscriptionManagerConfig);
  }
}

export default ContextHelper;
