import { CoreModule } from "../core/CoreModule";

export default class OneSignalBase {
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
