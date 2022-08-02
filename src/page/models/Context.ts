import { WorkerMessenger } from '../../shared/libraries/WorkerMessenger';
import { ServiceWorkerManager } from '../../shared/managers/ServiceWorkerManager';
import { PushSubscriptionManager } from '../../shared/managers/PushSubscriptionManager';
import { DynamicResourceLoader } from '../services/DynamicResourceLoader';
import { PageViewManager } from '../../shared/managers/PageViewManager';
import PermissionManager from '../../shared/managers/PermissionManager';
import { ContextSWInterface } from "../../shared/models/ContextSW";
import ContextHelper from "../../shared/helpers/ContextHelper";
import { UpdateManager } from "../../shared/managers/UpdateManager";
import { ISessionManager } from "../../shared/managers/sessionManager/types";
import { SessionManager } from "../../shared/managers/sessionManager/SessionManager";
import { EnvironmentInfo } from "./EnvironmentInfo";
import TagManager from '../managers/tagManager/TagManager';
import { ITagManager } from '../managers/tagManager/types';
import { ISlidedownManager } from '../managers/slidedownManager/types';
import { SlidedownManager } from '../managers/slidedownManager/SlidedownManager';
import { SecondaryChannelManager } from '../../shared/managers/channelManager/SecondaryChannelManager';
import { AppConfig } from '../../shared/models/AppConfig';
import MetricsManager from '../managers/MetricsManager';
import { PromptsManager } from '../managers/PromptsManager';
import { EnvironmentInfoHelper } from '../helpers/EnvironmentInfoHelper';
import OneSignalError from '../../shared/errors/OneSignalError';

export interface ContextInterface extends ContextSWInterface {
  dynamicResourceLoader: DynamicResourceLoader;
  metricsManager: MetricsManager;
  environmentInfo?: EnvironmentInfo;
  tagManager: ITagManager;
  slidedownManager: ISlidedownManager;
}

export default class Context implements ContextInterface {
  public appConfig: AppConfig;
  public environmentInfo: EnvironmentInfo;
  public dynamicResourceLoader: DynamicResourceLoader;
  public subscriptionManager: PushSubscriptionManager;
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
  public secondaryChannelManager: SecondaryChannelManager;

  constructor(appConfig: AppConfig) {
    this.appConfig = appConfig;
    this.environmentInfo = EnvironmentInfoHelper.getEnvironmentInfo();
    this.secondaryChannelManager = new SecondaryChannelManager();
    this.subscriptionManager = ContextHelper.getSubscriptionManager(this);
    this.serviceWorkerManager = ContextHelper.getServiceWorkerManager(this);
    this.pageViewManager = new PageViewManager();
    this.permissionManager = new PermissionManager();
    this.workerMessenger = new WorkerMessenger(this);
    this.updateManager = new UpdateManager(this);
    this.sessionManager = new SessionManager(this);
    this.tagManager = new TagManager(this);
    this.slidedownManager = new SlidedownManager(this, this.secondaryChannelManager);
    this.promptsManager = new PromptsManager(this);
    this.dynamicResourceLoader = new DynamicResourceLoader();
    this.metricsManager = new MetricsManager(appConfig.metrics.enable, appConfig.metrics.mixpanelReportingToken);
  }
}
