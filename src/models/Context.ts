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
import { UpdateManager } from "../managers/UpdateManager";
import { PromptsManager } from "../managers/PromptsManager";

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
  public updateManager: UpdateManager;
  public promptsManager: PromptsManager;

  constructor(appConfig: AppConfig) {
    this.appConfig = appConfig;
    this.subscriptionManager = ContextHelper.getSubscriptionManager(this);
    this.serviceWorkerManager = ContextHelper.getServiceWorkerManager(this);
    this.sessionManager = new SessionManager();
    this.permissionManager = new PermissionManager();
    this.workerMessenger = new WorkerMessenger(this);
    this.updateManager = new UpdateManager(this);
    
    this.promptsManager = new PromptsManager(this);
    this.cookieSyncer = new CookieSyncer(this, appConfig.cookieSyncEnabled);
    this.dynamicResourceLoader = new DynamicResourceLoader();
    this.metricsManager = new MetricsManager(appConfig.metrics.enable, appConfig.metrics.mixpanelReportingToken);
  }
}
