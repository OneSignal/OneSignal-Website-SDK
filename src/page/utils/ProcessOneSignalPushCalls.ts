import type { OneSignalDeferredLoadedCallback } from '../../page/models/OneSignalDeferredLoadedCallback';

export class ProcessOneSignalPushCalls {
  public static processItem(
    oneSignalInstance: typeof OneSignal,
    item: OneSignalDeferredLoadedCallback,
  ) {
    if (typeof item === 'function') return item(oneSignalInstance);
    else {
      throw new Error('Callback is not a function');
    }
  }
}
