import type { AppConfig } from 'src/shared/config/types';
import type { ContextInterface } from 'src/shared/context/types';
import { WorkerMessengerPage } from 'src/shared/libraries/workerMessenger/page';
import {
  getServiceWorkerManager,
  getSubscriptionManagerPage,
} from '../../shared/helpers/context';
import PermissionManager from '../../shared/managers/PermissionManager';
import { ServiceWorkerManager } from '../../shared/managers/ServiceWorkerManager';
import { SessionManager } from '../../shared/managers/sessionManager/SessionManager';
import type { ISessionManager } from '../../shared/managers/sessionManager/types';
import { SubscriptionManagerPage } from '../../shared/managers/subscription/page';
import { UpdateManager } from '../../shared/managers/UpdateManager';
import { PromptsManager } from '../managers/PromptsManager';
import { SlidedownManager } from '../managers/slidedownManager/SlidedownManager';
import type { ISlidedownManager } from '../managers/slidedownManager/types';
import TagManager from '../managers/tagManager/TagManager';
import type { ITagManager } from '../managers/tagManager/types';
import { DynamicResourceLoader } from '../services/DynamicResourceLoader';

export default class Context implements ContextInterface {
  public appConfig: AppConfig;
  public dynamicResourceLoader: DynamicResourceLoader;
  public subscriptionManager: SubscriptionManagerPage;
  public serviceWorkerManager: ServiceWorkerManager;
  public workerMessenger: WorkerMessengerPage;
  public permissionManager: PermissionManager;
  public updateManager: UpdateManager<ContextInterface>;
  public promptsManager: PromptsManager;
  public sessionManager: ISessionManager;
  public tagManager: ITagManager;
  public slidedownManager: ISlidedownManager;

  constructor(appConfig: AppConfig) {
    this.appConfig = appConfig;
    this.subscriptionManager = getSubscriptionManagerPage(this);
    this.serviceWorkerManager = getServiceWorkerManager(this);
    this.permissionManager = new PermissionManager();
    this.workerMessenger = new WorkerMessengerPage(this);
    this.updateManager = new UpdateManager(this);
    this.sessionManager = new SessionManager(this);
    this.tagManager = new TagManager(this);
    this.slidedownManager = new SlidedownManager(this);
    this.promptsManager = new PromptsManager(this);
    this.dynamicResourceLoader = new DynamicResourceLoader();
  }
}
