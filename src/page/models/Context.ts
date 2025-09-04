import type { AppConfig } from 'src/shared/config/types';
import type { ContextInterface } from 'src/shared/context/types';
import { WorkerMessengerPage } from 'src/shared/libraries/workerMessenger/page';
import {
  getServiceWorkerManager,
  getSubscriptionManagerPage,
} from '../../shared/helpers/context';
import { ServiceWorkerManager } from '../../shared/managers/ServiceWorkerManager';
import { SessionManager } from '../../shared/managers/sessionManager/SessionManager';
import { SubscriptionManagerPage } from '../../shared/managers/subscription/page';
import { UpdateManager } from '../../shared/managers/UpdateManager';
import { PromptsManager } from '../managers/PromptsManager';
import { SlidedownManager } from '../managers/slidedownManager/SlidedownManager';
import TagManager from '../managers/tagManager/TagManager';
import { DynamicResourceLoader } from '../services/DynamicResourceLoader';

export default class Context implements ContextInterface {
  public _appConfig: AppConfig;
  public _dynamicResourceLoader: DynamicResourceLoader;
  public _subscriptionManager: SubscriptionManagerPage;
  public _serviceWorkerManager: ServiceWorkerManager;
  public _workerMessenger: WorkerMessengerPage;
  public _updateManager: UpdateManager;
  public _promptsManager: PromptsManager;
  public _sessionManager: SessionManager;
  public _tagManager: TagManager;
  public _slidedownManager: SlidedownManager;

  constructor(appConfig: AppConfig) {
    this._appConfig = appConfig;
    this._subscriptionManager = getSubscriptionManagerPage(this);
    this._serviceWorkerManager = getServiceWorkerManager(this);
    this._workerMessenger = new WorkerMessengerPage(this);
    this._updateManager = new UpdateManager(this);
    this._sessionManager = new SessionManager(this);
    this._tagManager = new TagManager(this);
    this._slidedownManager = new SlidedownManager(this);
    this._promptsManager = new PromptsManager(this);
    this._dynamicResourceLoader = new DynamicResourceLoader();
  }
}
