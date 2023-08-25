import Log from '../../shared/libraries/Log';
import OneSignal from '../../onesignal/OneSignal';
import { OneSignalDeferredLoadedCallback } from '../models/OneSignalDeferredLoadedCallback';

// TODO: Renaming ReplayCallsOnOneSignal in a future commit
export class ReplayCallsOnOneSignal {
  static processOneSignalDeferredArray(
    onesignalDeferred: OneSignalDeferredLoadedCallback[],
  ): void {
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
