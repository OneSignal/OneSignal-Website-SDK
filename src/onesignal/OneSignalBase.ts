import { CoreModule } from "../core/CoreModule";
import Context from "../page/models/Context";
import { EnvironmentInfo } from "../page/models/EnvironmentInfo";
import ProxyFrameHost from "../page/modules/frames/ProxyFrameHost";
import { ProcessOneSignalPushCalls } from "../page/utils/ProcessOneSignalPushCalls";
import Emitter from "../shared/libraries/Emitter";
import Log from "../shared/libraries/Log";
import { AppConfig } from "../shared/models/AppConfig";
import { NotificationsNamespace } from "./temp/NotificationsNamespace";
import ONESIGNAL_EVENTS from "./temp/OneSignalEvents";
import { SlidedownNamespace } from "./temp/SlidedownNamespace";
import { User } from "./temp/User";

export default class OneSignalBase {
  public user?: User;
  public notifications: NotificationsNamespace;
  public slidedown: SlidedownNamespace;

  protected config?: AppConfig;
  protected context?: Context;
  protected core: CoreModule;
  protected static log: Log;

  protected requiresPrivacyConsent?: boolean;

  protected proxyFrameHost?: ProxyFrameHost;
  protected environmentInfo?: EnvironmentInfo;
  protected emitter: Emitter = new Emitter();
  protected EVENTS: {[key: string]: string} = ONESIGNAL_EVENTS;

  /* singleton pattern */
  private static instance: OneSignalBase;
  protected static getInstance(): OneSignalBase {
    if (!OneSignalBase.instance) {
      OneSignalBase.instance = new OneSignalBase();
    }
    return OneSignalBase.instance;
  }

  protected constructor() {
    this.core = new CoreModule();
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
