import OneSignal from '../../onesignal/OneSignal';

/**
 * Queued callback from `OneSignalDeferred` / `OneSignal.push`.
 * May be sync or return a Promise (or any thenable) so the loader can await completion.
 */
export type OneSignalDeferredLoadedCallback = (
  onesignal: typeof OneSignal,
) => void | PromiseLike<void>;
