/**
 * This is OneSignalSDK.page.es6.js(ES6)
 * Loaded from OneSignalSDK.page.js only if the browser supports push.
 */

import { incrementSdkLoadCount, getSdkLoadCount } from "../shared/utils/utils";
import { ReplayCallsOnOneSignal } from "../page/utils/ReplayCallsOnOneSignal";
import Log from "../shared/libraries/Log";

function onesignalSdkInit() {
  incrementSdkLoadCount();
  if (getSdkLoadCount() > 1) {
    Log.warn(`OneSignal: The web push SDK is included more than once. For optimal performance, please include our ` +
      `SDK only once on your page.`);
    Log.debug(`OneSignal: Exiting from SDK initialization to prevent double-initialization errors. ` +
      `Occurred ${getSdkLoadCount()} times.`);
    return;
  }

  // We're running in the host page, iFrame of the host page, or popup window
  // Load OneSignal's web SDK
  // TODO: A new iFrame and popup window pages probably need to be created for this major release?

  // TODO: We might be able to remove this down the line but reasons to keep for now:
  //         * Number of internal SDK code expects window.OneSignal
  //         * Keep JS console usage easier for debugging / testing.
  (<any>window).OneSignal = require('../onesignal/OneSignal').default;
  ReplayCallsOnOneSignal.processOneSignalDeferredArray((<any>window).OneSignalDeferred);
}
onesignalSdkInit();
