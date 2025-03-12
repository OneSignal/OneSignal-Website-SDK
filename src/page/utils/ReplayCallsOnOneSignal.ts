import OneSignal from '../../onesignal/OneSignal';
import Log from '../../shared/libraries/Log';
import { OneSignalDeferredLoadedCallback } from '../models/OneSignalDeferredLoadedCallback';

// TODO: Renaming ReplayCallsOnOneSignal in a future commit
export class ReplayCallsOnOneSignal {
  static async processOneSignalDeferredArray(
    onesignalDeferred: OneSignalDeferredLoadedCallback[],
  ): Promise<void> {
    for (const item of onesignalDeferred) {
      try {
        await OneSignal.push(item);
      } catch (e) {
        // Catch and log error here so other elements still run
        Log.error(e);
      }
    }
  }
}
