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
import TagManager from '../managers/tagManager/TagManager';
import type { ITagManager } from '../managers/tagManager/types';
import { DynamicResourceLoader } from '../services/DynamicResourceLoader';

export default class Context implements ContextInterface {
  public _appConfig: AppConfig;
  public _dynamicResourceLoader: DynamicResourceLoader;
  public _subscriptionManager: SubscriptionManagerPage;
  public _serviceWorkerManager: ServiceWorkerManager;
  public _workerMessenger: WorkerMessengerPage;
  public _permissionManager: PermissionManager;
  public _updateManager: UpdateManager;
  public _promptsManager: PromptsManager;
  public _sessionManager: ISessionManager;
  public _tagManager: ITagManager;
  public _slidedownManager: SlidedownManager;

  constructor(appConfig: AppConfig) {
    this._appConfig = appConfig;
    this._subscriptionManager = getSubscriptionManagerPage(this);
    this._serviceWorkerManager = getServiceWorkerManager(this);
    this._permissionManager = new PermissionManager();
    this._workerMessenger = new WorkerMessengerPage(this);
    this._updateManager = new UpdateManager(this);
    this._sessionManager = new SessionManager(this);
    this._tagManager = new TagManager(this);
    this._slidedownManager = new SlidedownManager(this);
    this._promptsManager = new PromptsManager(this);
    this._dynamicResourceLoader = new DynamicResourceLoader();
  }
}
