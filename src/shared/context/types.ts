import type { PromptsManager } from 'src/page/managers/PromptsManager';
import type { SlidedownManager } from 'src/page/managers/slidedownManager/SlidedownManager';
import type TagManager from 'src/page/managers/tagManager/TagManager';
import type { DynamicResourceLoader } from 'src/page/services/DynamicResourceLoader';
import type { AppConfig } from '../config/types';
import type { WorkerMessengerPage } from '../libraries/workerMessenger/page';
import type { WorkerMessengerSW } from '../libraries/workerMessenger/sw';
import type PermissionManager from '../managers/PermissionManager';
import type { ServiceWorkerManager } from '../managers/ServiceWorkerManager';
import type { SessionManager } from '../managers/sessionManager/SessionManager';
import type { SubscriptionManagerPage } from '../managers/subscription/page';
import type { SubscriptionManagerSW } from '../managers/subscription/sw';
import type { UpdateManager } from '../managers/UpdateManager';

export type RecursivePartial<T> = {
  [P in keyof T]?: RecursivePartial<T[P]>;
};

export interface ContextBase {
  _appConfig: AppConfig;
}

export interface ContextSWInterface extends ContextBase {
  _subscriptionManager: SubscriptionManagerSW;
  _workerMessenger: WorkerMessengerSW;
}

export interface ContextInterface extends ContextBase {
  _dynamicResourceLoader: DynamicResourceLoader;
  _permissionManager: PermissionManager;
  _promptsManager: PromptsManager;
  _serviceWorkerManager: ServiceWorkerManager;
  _sessionManager: SessionManager;
  _slidedownManager: SlidedownManager;
  _subscriptionManager: SubscriptionManagerPage;
  _tagManager: TagManager;
  _updateManager: UpdateManager;
  _workerMessenger: WorkerMessengerPage;
}
