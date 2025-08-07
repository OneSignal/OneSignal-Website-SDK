import { SessionManager } from '../../sw/managers/sessionManager/SessionManager';
import type { AppConfig } from '../config/types';
import type { ContextSWInterface } from '../context/types';
import {
  getServiceWorkerManager,
  getSubscriptionManagerSW,
} from '../helpers/context';
import { WorkerMessenger } from '../libraries/WorkerMessenger';
import PermissionManager from '../managers/PermissionManager';
import { ServiceWorkerManager } from '../managers/ServiceWorkerManager';
import type { ISessionManager } from '../managers/sessionManager/types';
import { SubscriptionManagerSW } from '../managers/subscription/sw';
import { UpdateManager } from '../managers/UpdateManager';

// TODO: Ideally this file should only import classes used by ServiceWorker.ts.
//       Example, ServiceWorkerManager should be remove as it is used by the page / browser,
//         not the ServiceWorker itself internally.

export default class ContextSW implements ContextSWInterface {
  public appConfig: AppConfig;
  public subscriptionManager: SubscriptionManagerSW;
  public serviceWorkerManager: ServiceWorkerManager<ContextSWInterface>;
  public sessionManager: ISessionManager;
  public permissionManager: PermissionManager;
  public workerMessenger: WorkerMessenger<ContextSWInterface>;
  public updateManager: UpdateManager<ContextSWInterface>;

  constructor(appConfig: AppConfig) {
    this.appConfig = appConfig;
    this.subscriptionManager = getSubscriptionManagerSW(this);
    this.serviceWorkerManager = getServiceWorkerManager(this);
    this.sessionManager = new SessionManager();
    this.permissionManager = new PermissionManager();
    this.workerMessenger = new WorkerMessenger(this);
    this.updateManager = new UpdateManager(this);
  }
}
