import { WorkerMessenger } from '../libraries/WorkerMessenger';
import { ServiceWorkerManager } from '../managers/ServiceWorkerManager';
import { SubscriptionManager } from '../managers/SubscriptionManager';
import { DynamicResourceLoader } from '../services/DynamicResourceLoader';
import CookieSyncer from '../modules/CookieSyncer';
import { AppConfig } from './AppConfig';
import { SessionManager } from '../managers/SessionManager';
import PermissionManager from '../managers/PermissionManager';
import MetricsManager from '../managers/MetricsManager';
import { ContextSWInterface } from "./ContextSW";
import ContextHelper from "../helpers/ContextHelper";

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
    this.subscriptionManager = ContextHelper.getSubscriptionManager(this);
    this.serviceWorkerManager = ContextHelper.getServiceWorkerManager(this);
    this.sessionManager = new SessionManager();
    this.permissionManager = new PermissionManager();
    this.workerMessenger = new WorkerMessenger(this);
    
    this.cookieSyncer = new CookieSyncer(this, appConfig.cookieSyncEnabled);
    this.dynamicResourceLoader = new DynamicResourceLoader();
    this.metricsManager = new MetricsManager(appConfig.metrics.enable, appConfig.metrics.mixpanelReportingToken);
  }
}
