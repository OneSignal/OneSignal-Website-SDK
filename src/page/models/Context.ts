import { WorkerMessenger } from '../../shared/libraries/WorkerMessenger';
import { ServiceWorkerManager } from '../../shared/managers/ServiceWorkerManager';
import { SubscriptionManager } from '../../shared/managers/SubscriptionManager';
import { DynamicResourceLoader } from '../services/DynamicResourceLoader';
import { PageViewManager } from '../../shared/managers/PageViewManager';
import PermissionManager from '../../shared/managers/PermissionManager';
import { ContextSWInterface } from '../../shared/models/ContextSW';
import ContextHelper from '../../shared/helpers/ContextHelper';
import { UpdateManager } from '../../shared/managers/UpdateManager';
import { ISessionManager } from '../../shared/managers/sessionManager/types';
import { SessionManager } from '../../shared/managers/sessionManager/SessionManager';
import { EnvironmentInfo } from './EnvironmentInfo';
import TagManager from '../managers/tagManager/TagManager';
import { ITagManager } from '../managers/tagManager/types';
import { ISlidedownManager } from '../managers/slidedownManager/types';
import { SlidedownManager } from '../managers/slidedownManager/SlidedownManager';
import { AppConfig } from '../../shared/models/AppConfig';
import MetricsManager from '../managers/MetricsManager';
import { PromptsManager } from '../managers/PromptsManager';

export interface ContextInterface extends ContextSWInterface {
  dynamicResourceLoader: DynamicResourceLoader;
  metricsManager: MetricsManager;
  environmentInfo?: EnvironmentInfo;
  tagManager: ITagManager;
  slidedownManager: ISlidedownManager;
}

export default class Context implements ContextInterface {
  public appConfig: AppConfig;
  public environmentInfo?: EnvironmentInfo;
  public dynamicResourceLoader: DynamicResourceLoader;
  public subscriptionManager: SubscriptionManager;
  public serviceWorkerManager: ServiceWorkerManager;
  public workerMessenger: WorkerMessenger;
  public pageViewManager: PageViewManager;
  public permissionManager: PermissionManager;
  public metricsManager: MetricsManager;
  public updateManager: UpdateManager;
  public promptsManager: PromptsManager;
  public sessionManager: ISessionManager;
  public tagManager: ITagManager;
  public slidedownManager: ISlidedownManager;

  constructor(appConfig: AppConfig) {
    this.appConfig = appConfig;
    if (typeof OneSignal !== 'undefined' && !!OneSignal.environmentInfo) {
      this.environmentInfo = OneSignal.environmentInfo;
    }
    this.subscriptionManager = ContextHelper.getSubscriptionManager(this);
    this.serviceWorkerManager = ContextHelper.getServiceWorkerManager(this);
    this.pageViewManager = new PageViewManager();
    this.permissionManager = new PermissionManager();
    this.workerMessenger = new WorkerMessenger(this);
    this.updateManager = new UpdateManager(this);
    this.sessionManager = new SessionManager(this);
    this.tagManager = new TagManager(this);
    this.slidedownManager = new SlidedownManager(this);
    this.promptsManager = new PromptsManager(this);
    this.dynamicResourceLoader = new DynamicResourceLoader();
    this.metricsManager = new MetricsManager(
      appConfig.metrics.enable,
      appConfig.metrics.mixpanelReportingToken,
    );
  }
}
