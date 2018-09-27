import { WorkerMessenger } from '../libraries/WorkerMessenger';
import { ServiceWorkerManager } from '../managers/ServiceWorkerManager';
import { SubscriptionManager } from '../managers/SubscriptionManager';
import { AppConfig } from './AppConfig';
import Path from './Path';
import SdkEnvironment from '../managers/SdkEnvironment';
import { SessionManager } from '../managers/SessionManager';
import PermissionManager from '../managers/PermissionManager';

export interface ContextSWInterface {
  appConfig: AppConfig;
  subscriptionManager: SubscriptionManager;
  serviceWorkerManager: ServiceWorkerManager;
  sessionManager: SessionManager;
  permissionManager: PermissionManager;
  workerMessenger: WorkerMessenger;
}

export default class ContextSW implements ContextSWInterface {
  public appConfig: AppConfig;
  public subscriptionManager: SubscriptionManager;
  public serviceWorkerManager: ServiceWorkerManager;
  public sessionManager: SessionManager;
  public permissionManager: PermissionManager;
  public workerMessenger: WorkerMessenger;

  constructor(appConfig: AppConfig) {
    // TODO Iryna duplicated code from Context. Move into helper?
    this.appConfig = appConfig;

    this.subscriptionManager = new SubscriptionManager(this, {
      safariWebId: appConfig.safariWebId,
      appId: appConfig.appId,
      vapidPublicKey: appConfig.vapidPublicKey,
      onesignalVapidPublicKey: appConfig.onesignalVapidPublicKey,
    });

    const envPrefix = SdkEnvironment.getBuildEnvPrefix();
    const serviceWorkerManagerConfig = {
      workerAPath: new Path(`/${envPrefix}OneSignalSDKWorker.js`),
      workerBPath: new Path(`/${envPrefix}OneSignalSDKUpdaterWorker.js`),
      registrationOptions: { scope: '/' }
    };
    if (appConfig.userConfig) {
      if (appConfig.userConfig.path) {
        serviceWorkerManagerConfig.workerAPath =
          new Path(`${appConfig.userConfig.path}${envPrefix}${appConfig.userConfig.serviceWorkerPath}`);
          // new Path((appConfig.userConfig.path) + SdkEnvironment.getBuildEnvPrefix() + appConfig.userConfig.serviceWorkerPath);
        serviceWorkerManagerConfig.workerBPath =
          new Path(`${appConfig.userConfig.path}${envPrefix}${appConfig.userConfig.serviceWorkerUpdaterPath}`);
          // new Path((appConfig.userConfig.path) + SdkEnvironment.getBuildEnvPrefix() + appConfig.userConfig.serviceWorkerUpdaterPath);
      }
      if (appConfig.userConfig.serviceWorkerParam) {
        serviceWorkerManagerConfig.registrationOptions = appConfig.userConfig.serviceWorkerParam;
      }
    }
    this.serviceWorkerManager = new ServiceWorkerManager(this, serviceWorkerManagerConfig);

    this.sessionManager = new SessionManager();
    this.permissionManager = new PermissionManager();
    this.workerMessenger = new WorkerMessenger(this);
  }
}