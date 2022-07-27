import { CoreModule } from "../core/CoreModule";
import Context from "../page/models/Context";
import { AppConfig } from "../shared/models/AppConfig";
import { NotificationsNamespace } from "./temp/NotificationsNamespace";
import { SlidedownNamespace } from "./temp/SlidedownNamespace";
import { User } from "./temp/User";

export default class OneSignalBase {
  public user?: User;
  public notifications: NotificationsNamespace;
  public slidedown: SlidedownNamespace;

  protected config?: AppConfig;
  protected context?: Context;
  protected core: CoreModule;

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
}
