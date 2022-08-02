import { WorkerMessenger } from '../libraries/WorkerMessenger';
import { ServiceWorkerManager } from '../managers/ServiceWorkerManager';
import { PushSubscriptionManager } from '../managers/PushSubscriptionManager';
import { AppConfig } from './AppConfig';
import { PageViewManager } from '../managers/PageViewManager';
import PermissionManager from '../managers/PermissionManager';
import ContextHelper from "../helpers/ContextHelper";
import { UpdateManager } from "../managers/UpdateManager";
import { ISessionManager } from "../managers/sessionManager/types";
import { SessionManager } from "../../sw/managers/sessionManager/SessionManager";
import { SecondaryChannelManager } from '../managers/channelManager/SecondaryChannelManager';


// TODO: Ideally this file should only import classes used by ServiceWorker.ts.
//       Example, ServiceWorkerManager should be remove as it is used by the page / browser,
//         not the ServiceWorker itself internally.

export interface ContextSWInterface {
  appConfig: AppConfig;
  subscriptionManager: PushSubscriptionManager;
  serviceWorkerManager: ServiceWorkerManager;
  pageViewManager: PageViewManager;
  sessionManager: ISessionManager;
  permissionManager: PermissionManager;
  workerMessenger: WorkerMessenger;
  updateManager: UpdateManager;
  secondaryChannelManager: SecondaryChannelManager;
}

export default class ContextSW implements ContextSWInterface {
  public appConfig: AppConfig;
  public subscriptionManager: PushSubscriptionManager;
  public serviceWorkerManager: ServiceWorkerManager;
  public pageViewManager: PageViewManager;
  public sessionManager: ISessionManager;
  public permissionManager: PermissionManager;
  public workerMessenger: WorkerMessenger;
  public updateManager: UpdateManager;
  public secondaryChannelManager: SecondaryChannelManager;

  constructor(appConfig: AppConfig) {
    this.appConfig = appConfig;
    this.subscriptionManager = ContextHelper.getSubscriptionManager(this);
    this.serviceWorkerManager = ContextHelper.getServiceWorkerManager(this);
    this.pageViewManager = new PageViewManager();
    this.sessionManager = new SessionManager(this);
    this.permissionManager = new PermissionManager();
    this.workerMessenger = new WorkerMessenger(this);
    this.updateManager = new UpdateManager(this);
    this.secondaryChannelManager = new SecondaryChannelManager();
  }
}
