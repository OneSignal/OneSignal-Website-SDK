import { CoreModule } from "../core/CoreModule";
import Context from "../page/models/Context";
import { EnvironmentInfo } from "../page/models/EnvironmentInfo";
import ProxyFrameHost from "../page/modules/frames/ProxyFrameHost";
import { ProcessOneSignalPushCalls } from "../page/utils/ProcessOneSignalPushCalls";
import Emitter from "../shared/libraries/Emitter";
import { AppConfig } from "../shared/models/AppConfig";
import { NotificationsNamespace } from "./notifications/NotificationsNamespace";
import ONESIGNAL_EVENTS from "./temp/OneSignalEvents";
import { SlidedownNamespace } from "./slidedown/SlidedownNamespace";
import User from "./user/User";

export default class OneSignalBase {
  public user?: User;
  public notifications?: NotificationsNamespace;
  public slidedown?: SlidedownNamespace;
  public context?: Context;

  protected config?: AppConfig;
  protected core: CoreModule;

  private contextPromise: Promise<void>;
  private contextResolver: (value: void | PromiseLike<void>) => void = () => {};

  protected proxyFrameHost?: ProxyFrameHost;
  protected environmentInfo?: EnvironmentInfo;
  protected EVENTS: {[key: string]: string} = ONESIGNAL_EVENTS;
  public emitter: Emitter = new Emitter();

  protected constructor() {
    this.core = CoreModule.getInstance();
    this.contextPromise = new Promise<void>(resolve => {
      this.contextResolver = resolve;
    });
    this.initNamespaces();
  }

  /**
   * used to initialize context as soon as config is available
   * @param  {AppConfig} config
   * @returns Promise
   */
  protected initContext(config: AppConfig): void {
    this.context = new Context(config);
    this.contextResolver();
  }

  // initializes Notification and Slidedown namespaces as soon as context is available
  private initNamespaces(): void {
    this.contextPromise.then(() => {
      this.notifications = new NotificationsNamespace(this.context as Context);
      this.slidedown = new SlidedownNamespace(this.context as Context);
    }).catch(err => {});
  }

  /**
   * Used to load OneSignal asynchronously from a webpage
   * Allows asynchronous function queuing while the SDK loads in the browser with <script src="..." async/>
   * @PublicApi
   * @param item - Ether a function or an arry with a OneSignal function name followed by it's parameters
   * @Example
   *  OneSignal.push(["functionName", param1, param2]);
   *  OneSignal.push(function() { OneSignal.functionName(param1, param2); });
   */
  public push(item: () => any | object[]): void {
    ProcessOneSignalPushCalls.processItem(this, item);
  }
}
