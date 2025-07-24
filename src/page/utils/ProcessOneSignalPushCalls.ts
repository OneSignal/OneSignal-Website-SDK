import OneSignalError from 'src/shared/errors/OneSignalError';
import type { OneSignalDeferredLoadedCallback } from '../../page/models/OneSignalDeferredLoadedCallback';

export class ProcessOneSignalPushCalls {
  public static processItem(
    oneSignalInstance: typeof OneSignal,
    item: OneSignalDeferredLoadedCallback,
  ) {
    if (typeof item === 'function') return item(oneSignalInstance);
    else {
      throw new OneSignalError('Only accepts function type!');
    }
  }
}
