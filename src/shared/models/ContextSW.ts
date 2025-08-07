import { SessionManager } from '../../sw/managers/sessionManager/SessionManager';
import type { AppConfig } from '../config/types';
import type { ContextSWInterface } from '../context/types';
import { getSubscriptionManagerSW } from '../helpers/context';
import { WorkerMessengerSW } from '../libraries/workerMessenger/sw';
import PermissionManager from '../managers/PermissionManager';
import type { ISessionManager } from '../managers/sessionManager/types';
import { SubscriptionManagerSW } from '../managers/subscription/sw';
import { UpdateManager } from '../managers/UpdateManager';

export default class ContextSW implements ContextSWInterface {
  public appConfig: AppConfig;
  public subscriptionManager: SubscriptionManagerSW;
  public sessionManager: ISessionManager;
  public permissionManager: PermissionManager;
  public workerMessenger: WorkerMessengerSW;
  public updateManager: UpdateManager<ContextSWInterface>;

  constructor(appConfig: AppConfig) {
    this.appConfig = appConfig;
    this.subscriptionManager = getSubscriptionManagerSW(this);
    this.sessionManager = new SessionManager();
    this.permissionManager = new PermissionManager();
    this.workerMessenger = new WorkerMessengerSW(this);
    this.updateManager = new UpdateManager(this);
  }
}
