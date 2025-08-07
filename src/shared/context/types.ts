import type { ISlidedownManager } from 'src/page/managers/slidedownManager/types';
import type { ITagManager } from 'src/page/managers/tagManager/types';
import type { DynamicResourceLoader } from 'src/page/services/DynamicResourceLoader';
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
  sessionManager: ISessionManager;
  permissionManager: PermissionManager;
}

export interface ContextSWInterface extends ContextBase {
  subscriptionManager: SubscriptionManagerSW;
  workerMessenger: WorkerMessengerSW;
  updateManager: UpdateManager<ContextSWInterface>;
}

export interface ContextInterface extends ContextBase {
  serviceWorkerManager: ServiceWorkerManager;
  subscriptionManager: SubscriptionManagerPage;
  workerMessenger: WorkerMessengerPage;
  dynamicResourceLoader: DynamicResourceLoader;
  tagManager: ITagManager;
  slidedownManager: ISlidedownManager;
  updateManager: UpdateManager<ContextInterface>;
}
