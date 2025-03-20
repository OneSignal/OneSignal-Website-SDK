/**
 * This is OneSignalSDK.page.es6.js(ES6)
 * Loaded from OneSignalSDK.page.js only if the browser supports push.
 */
import { OneSignalDeferredLoadedCallback } from 'src/page/models/OneSignalDeferredLoadedCallback';
import OneSignal from '../onesignal/OneSignal';
import { ReplayCallsOnOneSignal } from '../page/utils/ReplayCallsOnOneSignal';
import Log from '../shared/libraries/Log';
import { getSdkLoadCount, incrementSdkLoadCount } from '../shared/utils/utils';

/**
 * Since we use Vite lib mode, this is import is removed from the bundle but it will still
 * generate a separate CSS file.
 */
import './stylesheet.scss';

function onesignalSdkInit() {
  incrementSdkLoadCount();
  if (getSdkLoadCount() > 1) {
    Log.warn(
      `OneSignal: The web push SDK is included more than once. For optimal performance, please include our ` +
        `SDK only once on your page.`,
    );
    Log.debug(
      `OneSignal: Exiting from SDK initialization to prevent double-initialization errors. ` +
        `Occurred ${getSdkLoadCount()} times.`,
    );
    return;
  }

  // Load OneSignal's web SDK
  // TODO: We might be able to remove this down the line but reasons to keep for now:
  //         * Number of internal SDK code expects window.OneSignal
  //         * Keep JS console usage easier for debugging / testing.
  window.OneSignal = OneSignal;
  window.OneSignalDeferred = window.OneSignalDeferred ?? [];

  ReplayCallsOnOneSignal.processOneSignalDeferredArray(
    window.OneSignalDeferred,
  );

  Object.defineProperty(window.OneSignalDeferred, 'push', {
    value: function (item: OneSignalDeferredLoadedCallback) {
      OneSignal.push(item);
    },
  });
}

onesignalSdkInit();
