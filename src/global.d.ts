import { OneSignalDeferredLoadedCallback } from './page/models/OneSignalDeferredLoadedCallback';

type _OneSignal = typeof import('./onesignal/OneSignal').default;

declare global {
  const OneSignal: _OneSignal;

  interface Window {
    OneSignal: _OneSignal;
    OneSignalDeferred?: OneSignalDeferredLoadedCallback[];
    __oneSignalSdkLoadCount?: number;
    safari?: {
      pushNotification?: {};
    };
  }
}
