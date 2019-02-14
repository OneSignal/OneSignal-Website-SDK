// Only loads on browsers that support push, logic is in isPushNotificationsSupported()

import Log from "../libraries/Log";
import { incrementSdkLoadCount, getSdkLoadCount } from "../utils";

export function oneSignalSdkInit() {
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
  let predefinedOneSignalPushes: Function[] | object[] | undefined | null;
  if (typeof OneSignal !== "undefined") {
    predefinedOneSignalPushes = OneSignal;
  }

  (window as any).OneSignal = require('../OneSignal').default;

  if (predefinedOneSignalPushes) {
    if (!Array.isArray(predefinedOneSignalPushes)) {
      Log.error("'OneSignal' was not defined as an Array. Skipping pushes");
      return;
    }

    for (const item of predefinedOneSignalPushes) {
      try {
        OneSignal.push(item);
      } catch (e) {
        // Catch and log error here so other elements still run
        Log.error(e);
      }
    }
  }
}

// Only if running on page in browser
if (typeof window !== "undefined")
  oneSignalSdkInit();
