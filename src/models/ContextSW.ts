import { WorkerMessenger } from '../libraries/WorkerMessenger';
import { ServiceWorkerManager } from '../managers/ServiceWorkerManager';
import { SubscriptionManager } from '../managers/SubscriptionManager';
import { AppConfig } from './AppConfig';
import { PageViewManager } from '../managers/PageViewManager';
import PermissionManager from '../managers/PermissionManager';
import ContextHelper from "../helpers/ContextHelper";
import { UpdateManager } from "../managers/UpdateManager";
import { SessionManager } from '../managers/SessionManager';

export interface ContextSWInterface {
  appConfig: AppConfig;
  subscriptionManager: SubscriptionManager;
  serviceWorkerManager: ServiceWorkerManager;
  pageViewManager: PageViewManager;
  sessionManager: SessionManager;
  permissionManager: PermissionManager;
  workerMessenger: WorkerMessenger;
  updateManager: UpdateManager;
}

export default class ContextSW implements ContextSWInterface {
  public appConfig: AppConfig;
  public subscriptionManager: SubscriptionManager;
  public serviceWorkerManager: ServiceWorkerManager;
  public pageViewManager: PageViewManager;
  public sessionManager: SessionManager;
  public permissionManager: PermissionManager;
  public workerMessenger: WorkerMessenger;
  public updateManager: UpdateManager;

  constructor(appConfig: AppConfig) {
    this.appConfig = appConfig;
    this.subscriptionManager = ContextHelper.getSubscriptionManager(this);
    this.serviceWorkerManager = ContextHelper.getServiceWorkerManager(this);
    this.pageViewManager = new PageViewManager();
    this.sessionManager = new SessionManager(this);
    this.permissionManager = new PermissionManager();
    this.workerMessenger = new WorkerMessenger(this);
    this.updateManager = new UpdateManager(this);
  }
}