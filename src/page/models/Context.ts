import type { AppConfig } from 'src/shared/config/types';
import {
  getServiceWorkerManager,
  getSubscriptionManager,
} from '../../shared/helpers/context';
import { WorkerMessenger } from '../../shared/libraries/WorkerMessenger';
import PermissionManager from '../../shared/managers/PermissionManager';
import { ServiceWorkerManager } from '../../shared/managers/ServiceWorkerManager';
import { SessionManager } from '../../shared/managers/sessionManager/SessionManager';
import type { ISessionManager } from '../../shared/managers/sessionManager/types';
import { SubscriptionManager } from '../../shared/managers/SubscriptionManager';
import { UpdateManager } from '../../shared/managers/UpdateManager';
import type { ContextSWInterface } from '../../shared/models/ContextSW';
import { PromptsManager } from '../managers/PromptsManager';
import { SlidedownManager } from '../managers/slidedownManager/SlidedownManager';
import type { ISlidedownManager } from '../managers/slidedownManager/types';
import TagManager from '../managers/tagManager/TagManager';
import type { ITagManager } from '../managers/tagManager/types';
import { DynamicResourceLoader } from '../services/DynamicResourceLoader';

export interface ContextInterface extends ContextSWInterface {
  dynamicResourceLoader: DynamicResourceLoader;
  tagManager: ITagManager;
  slidedownManager: ISlidedownManager;
}

export default class Context implements ContextInterface {
  public appConfig: AppConfig;
  public dynamicResourceLoader: DynamicResourceLoader;
  public subscriptionManager: SubscriptionManager;
  public serviceWorkerManager: ServiceWorkerManager;
  public workerMessenger: WorkerMessenger;
  public permissionManager: PermissionManager;
  public updateManager: UpdateManager;
  public promptsManager: PromptsManager;
  public sessionManager: ISessionManager;
  public tagManager: ITagManager;
  public slidedownManager: ISlidedownManager;

  constructor(appConfig: AppConfig) {
    this.appConfig = appConfig;
    this.subscriptionManager = getSubscriptionManager(this);
    this.serviceWorkerManager = getServiceWorkerManager(this);
    this.permissionManager = new PermissionManager();
    this.workerMessenger = new WorkerMessenger(this);
    this.updateManager = new UpdateManager(this);
    this.sessionManager = new SessionManager(this);
    this.tagManager = new TagManager(this);
    this.slidedownManager = new SlidedownManager(this);
    this.promptsManager = new PromptsManager(this);
    this.dynamicResourceLoader = new DynamicResourceLoader();
  }
}
