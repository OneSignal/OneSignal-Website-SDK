import { OneSignalDeferredLoadedCallback } from "../../page/models/OneSignalDeferredLoadedCallback";
import OneSignalError from "../../shared/errors/OneSignalError";

export class ProcessOneSignalPushCalls {
  public static processItem(oneSignalInstance: IOneSignal, item: OneSignalDeferredLoadedCallback) {
    if (typeof(item) === "function")
      item(oneSignalInstance);
    else {
      throw new OneSignalError("Only accepts function type!");
    }
  }
}
