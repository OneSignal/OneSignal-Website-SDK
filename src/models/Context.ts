import { WorkerMessenger } from '../libraries/WorkerMessenger';
import { ServiceWorkerManager } from '../managers/ServiceWorkerManager';
import { SubscriptionManager, SubscriptionManagerConfig } from '../managers/SubscriptionManager';
import { DynamicResourceLoader } from '../services/DynamicResourceLoader';
import CookieSyncer from '../modules/CookieSyncer';
import { AppConfig } from './AppConfig';
import Path from './Path';
import SdkEnvironment from '../managers/SdkEnvironment';
import { SessionManager } from '../managers/SessionManager';
import PermissionManager from '../managers/PermissionManager';
import MetricsManager from '../managers/MetricsManager';
import { ContextSWInterface } from "./ContextSW";

export interface ContextInterface extends ContextSWInterface {
  dynamicResourceLoader: DynamicResourceLoader;
  cookieSyncer: CookieSyncer;
  metricsManager: MetricsManager;
}

export default class Context implements ContextInterface {
  public appConfig: AppConfig;
  public dynamicResourceLoader: DynamicResourceLoader;
  public subscriptionManager: SubscriptionManager;
  public serviceWorkerManager: ServiceWorkerManager;
  public workerMessenger: WorkerMessenger;
  public cookieSyncer: CookieSyncer;
  public sessionManager: SessionManager;
  public permissionManager: PermissionManager;
  public metricsManager: MetricsManager;

  constructor(appConfig: AppConfig) {
    this.appConfig = appConfig;

    this.cookieSyncer = new CookieSyncer(this, appConfig.cookieSyncEnabled);

    const subscriptionManagerConfig: SubscriptionManagerConfig = {
      safariWebId: appConfig.safariWebId,
      appId: appConfig.appId,
      vapidPublicKey: appConfig.vapidPublicKey,
      onesignalVapidPublicKey: appConfig.onesignalVapidPublicKey,
    };
    this.subscriptionManager = new SubscriptionManager(this, subscriptionManagerConfig);

    const serviceWorkerManagerConfig = {
      workerAPath: new Path('/' + SdkEnvironment.getBuildEnvPrefix() + 'OneSignalSDKWorker.js'),
      workerBPath: new Path('/'+ SdkEnvironment.getBuildEnvPrefix() + 'OneSignalSDKUpdaterWorker.js'),
      registrationOptions: { scope: '/' }
    };
    if (appConfig.userConfig) {
      if (appConfig.userConfig.path) {
        serviceWorkerManagerConfig.workerAPath = new Path((appConfig.userConfig.path) + SdkEnvironment.getBuildEnvPrefix() + appConfig.userConfig.serviceWorkerPath);
        serviceWorkerManagerConfig.workerBPath = new Path((appConfig.userConfig.path) + SdkEnvironment.getBuildEnvPrefix() + appConfig.userConfig.serviceWorkerUpdaterPath);
      }
      if (appConfig.userConfig.serviceWorkerParam) {
        serviceWorkerManagerConfig.registrationOptions = appConfig.userConfig.serviceWorkerParam;
      }
    }
    this.serviceWorkerManager = new ServiceWorkerManager(this, serviceWorkerManagerConfig);

    this.workerMessenger = new WorkerMessenger(this);
    this.dynamicResourceLoader = new DynamicResourceLoader();

    this.sessionManager = new SessionManager();
    this.permissionManager = new PermissionManager();
    this.metricsManager = new MetricsManager(appConfig.metrics.enable, appConfig.metrics.mixpanelReportingToken);
  }
}
