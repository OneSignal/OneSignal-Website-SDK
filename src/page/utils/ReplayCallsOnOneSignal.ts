import Log from "../../shared/libraries/Log";

// TODO: Renaming ReplayCallsOnOneSignal in a future commit
export class ReplayCallsOnOneSignal {
  static processOneSignalDeferredArray(onesignalDeferred: Function[]): void {
    for (const item of onesignalDeferred) {
      try {
        OneSignal.push(item);
      } catch (e) {
        // Catch and log error here so other elements still run
        Log.error(e);
      }
    }
  }
}
