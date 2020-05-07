import { WorkerMessenger } from '../libraries/WorkerMessenger';
import { ServiceWorkerManager } from '../managers/ServiceWorkerManager';
import { SubscriptionManager } from '../managers/SubscriptionManager';
import { DynamicResourceLoader } from '../services/DynamicResourceLoader';
import CookieSyncer from '../modules/CookieSyncer';
import { AppConfig } from './AppConfig';
import { PageViewManager } from '../managers/PageViewManager';
import PermissionManager from '../managers/PermissionManager';
import MetricsManager from '../managers/MetricsManager';
import { ContextSWInterface } from "./ContextSW";
import ContextHelper from "../helpers/ContextHelper";
import { UpdateManager } from "../managers/UpdateManager";
import { PromptsManager } from "../managers/PromptsManager";
import { ISessionManager } from "../managers/sessionManager/types";
import { SessionManager } from "../managers/sessionManager/page/SessionManager";
import { EnvironmentInfo } from "../context/browser/models/EnvironmentInfo";
import TagManager from '../managers/TagManager';

export interface ContextInterface extends ContextSWInterface {
  dynamicResourceLoader: DynamicResourceLoader;
  cookieSyncer: CookieSyncer;
  metricsManager: MetricsManager;
  environmentInfo?: EnvironmentInfo;
}

export default class Context implements ContextInterface {
  public appConfig: AppConfig;
  public environmentInfo?: EnvironmentInfo;
  public dynamicResourceLoader: DynamicResourceLoader;
  public subscriptionManager: SubscriptionManager;
  public serviceWorkerManager: ServiceWorkerManager;
  public workerMessenger: WorkerMessenger;
  public cookieSyncer: CookieSyncer;
  public pageViewManager: PageViewManager;
  public permissionManager: PermissionManager;
  public metricsManager: MetricsManager;
  public updateManager: UpdateManager;
  public promptsManager: PromptsManager;
  public sessionManager: ISessionManager;
  public tagManager: TagManager;

  constructor(appConfig: AppConfig) {
    this.appConfig = appConfig;
    if (typeof OneSignal !== "undefined" && !!OneSignal.environmentInfo) {
      this.environmentInfo = OneSignal.environmentInfo;
    }
    this.subscriptionManager = ContextHelper.getSubscriptionManager(this);
    this.serviceWorkerManager = ContextHelper.getServiceWorkerManager(this);
    this.pageViewManager = new PageViewManager();
    this.permissionManager = new PermissionManager();
    this.workerMessenger = new WorkerMessenger(this);
    this.updateManager = new UpdateManager(this);
    this.sessionManager = new SessionManager(this);
    this.tagManager = new TagManager();
    this.promptsManager = new PromptsManager(this);
    this.cookieSyncer = new CookieSyncer(this, appConfig.cookieSyncEnabled);
    this.dynamicResourceLoader = new DynamicResourceLoader();
    this.metricsManager = new MetricsManager(appConfig.metrics.enable, appConfig.metrics.mixpanelReportingToken);
  }
}
