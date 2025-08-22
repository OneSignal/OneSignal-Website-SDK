import OneSignal from '../../onesignal/OneSignal';
import log from '../../shared/helpers/log';
import { MessageType } from '../../shared/helpers/log/constants';
import type { OneSignalDeferredLoadedCallback } from '../models/OneSignalDeferredLoadedCallback';

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
        log(MessageType.Error, e);
      }
    }
  }
}
