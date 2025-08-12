import type { ISlidedownManager } from 'src/page/managers/Slidedown';
import type { ITagManager } from 'src/page/managers/Tag';
import type { DynamicResourceLoader } from 'src/page/services/resourceLoader';
import type { AppConfig } from '../config/types';
import type { WorkerMessengerPage } from '../libraries/workerMessenger/page';
import type { WorkerMessengerSW } from '../libraries/workerMessenger/sw';
import type PermissionManager from '../managers/PermissionManager';
import type { ServiceWorkerManager } from '../managers/ServiceWorkerManager';
import type { ISessionManager } from '../managers/sessionManager/types';
import type { SubscriptionManagerPage } from '../managers/subscription/page';
import type { SubscriptionManagerSW } from '../managers/subscription/sw';
import type { UpdateManager } from '../managers/UpdateManager';

export type RecursivePartial<T> = {
  [P in keyof T]?: RecursivePartial<T[P]>;
};

export interface ContextBase {
  appConfig: AppConfig;
}

export interface ContextSWInterface extends ContextBase {
  subscriptionManager: SubscriptionManagerSW;
  workerMessenger: WorkerMessengerSW;
}

export interface ContextInterface extends ContextBase {
  dynamicResourceLoader: DynamicResourceLoader;
  permissionManager: PermissionManager;
  serviceWorkerManager: ServiceWorkerManager;
  sessionManager: ISessionManager;
  slidedownManager: ISlidedownManager;
  subscriptionManager: SubscriptionManagerPage;
  tagManager: ITagManager;
  updateManager: UpdateManager;
  workerMessenger: WorkerMessengerPage;
}

export interface AppState {
  defaultNotificationUrl?: string | null;
  defaultNotificationTitle?: string | null;

  /**
   * Whether the user is currently completely subscribed, including not opted out. Database cached version of
   * isPushNotificationsEnabled().
   */
  lastKnownPushEnabled?: boolean | null;

  lastKnownPushToken?: string | null;

  lastKnownPushId?: string | null;

  lastKnownOptedIn?: boolean | null;
}
