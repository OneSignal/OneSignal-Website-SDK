/**
 * This is OneSignalPageSDKES6.js (ES6)
 * Loaded from OneSignalSDK.js only if the browser supports push.
 */

import { incrementSdkLoadCount, getSdkLoadCount } from "../shared/utils/utils";
import { ReplayCallsOnOneSignal } from "../page/utils/ReplayCallsOnOneSignal";
import { OneSignalStubES6 } from "../page/utils/OneSignalStubES6";
import Log from "../shared/libraries/Log";

function oneSignalSdkInit() {
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
  const predefinedOneSignal: OneSignalStubES6 | object[] | undefined | null = (<any>window).OneSignal;

  (<any>window).OneSignal = require('../onesignal/OneSignal').default;

  ReplayCallsOnOneSignal.doReplay(predefinedOneSignal);
}

// Only if running on page in browser
if (typeof window !== "undefined")
  oneSignalSdkInit();
