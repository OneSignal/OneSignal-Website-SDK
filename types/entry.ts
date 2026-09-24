import type { OneSignal as OneSignalApi } from '../src/onesignal/OneSignalInterface';

export type { OneSignal } from '../src/onesignal/OneSignalInterface';

declare global {
  interface Window {
    OneSignal: OneSignalApi;
    OneSignalDeferred?: ((oneSignal: OneSignalApi) => void | PromiseLike<void>)[];
  }
}
