import OneSignal from '../../onesignal/OneSignal';

export type OneSignalDeferredLoadedCallback = (
  onesignal: typeof OneSignal,
) => void;
