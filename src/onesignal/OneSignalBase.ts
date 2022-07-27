import { CoreModule } from "../core/CoreModule";
import { NotificationsNamespace } from "./temp/NotificationsNamespace";
import { SlidedownNamespace } from "./temp/SlidedownNamespace";
import { User } from "./temp/User";

export default class OneSignalBase {
  public user?: User;
  public notifications: NotificationsNamespace;
  public slidedown: SlidedownNamespace;

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
