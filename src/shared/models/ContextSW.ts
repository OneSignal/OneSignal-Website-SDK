import { SessionManager } from '../../sw/managers/sessionManager/SessionManager';
import ContextHelper from '../helpers/ContextHelper';
import { WorkerMessenger } from '../libraries/WorkerMessenger';
import { PageViewManager } from '../managers/PageViewManager';
import PermissionManager from '../managers/PermissionManager';
import { ServiceWorkerManager } from '../managers/ServiceWorkerManager';
import { SubscriptionManager } from '../managers/SubscriptionManager';
import { UpdateManager } from '../managers/UpdateManager';
import type { ISessionManager } from '../managers/sessionManager/types';
import type { AppConfig } from './AppConfig';

// TODO: Ideally this file should only import classes used by ServiceWorker.ts.
//       Example, ServiceWorkerManager should be remove as it is used by the page / browser,
//         not the ServiceWorker itself internally.

export interface ContextSWInterface {
  appConfig: AppConfig;
  subscriptionManager: SubscriptionManager;
  serviceWorkerManager: ServiceWorkerManager;
  pageViewManager: PageViewManager;
  sessionManager: ISessionManager;
  permissionManager: PermissionManager;
  workerMessenger: WorkerMessenger;
  updateManager: UpdateManager;
}

export default class ContextSW implements ContextSWInterface {
  public appConfig: AppConfig;
  public subscriptionManager: SubscriptionManager;
  public serviceWorkerManager: ServiceWorkerManager;
  public pageViewManager: PageViewManager;
  public sessionManager: ISessionManager;
  public permissionManager: PermissionManager;
  public workerMessenger: WorkerMessenger;
  public updateManager: UpdateManager;

  constructor(appConfig: AppConfig) {
    this.appConfig = appConfig;
    this.subscriptionManager = ContextHelper.getSubscriptionManager(this);
    this.serviceWorkerManager = ContextHelper.getServiceWorkerManager(this);
    this.pageViewManager = new PageViewManager();
    this.sessionManager = new SessionManager();
    this.permissionManager = new PermissionManager();
    this.workerMessenger = new WorkerMessenger(this);
    this.updateManager = new UpdateManager(this);
  }
}
