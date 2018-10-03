import { WorkerMessenger } from '../libraries/WorkerMessenger';
import { ServiceWorkerManager } from '../managers/ServiceWorkerManager';
import { SubscriptionManager } from '../managers/SubscriptionManager';
import { AppConfig } from './AppConfig';
import { SessionManager } from '../managers/SessionManager';
import PermissionManager from '../managers/PermissionManager';
import ContextHelper from "../helpers/ContextHelper";

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
    this.appConfig = appConfig;
    this.subscriptionManager = ContextHelper.getSubscriptionManager(this);
    this.serviceWorkerManager = ContextHelper.getServiceWorkerManager(this);
    this.sessionManager = new SessionManager();
    this.permissionManager = new PermissionManager();
    this.workerMessenger = new WorkerMessenger(this);
  }
}