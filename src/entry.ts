import Environment from './environment.js';
import { getSdkLoadCount, incrementSdkLoadCount } from './utils';
import * as log from 'loglevel';


if (Environment.isBrowser()) {
  incrementSdkLoadCount();
  if (getSdkLoadCount() > 1) {
    log.warn(`OneSignal: The web push SDK is included more than once. For optimal performance, please include our ` +
             `SDK only once on your page.`);
    log.debug(`OneSignal: Exiting from SDK initialization to prevent double-initialization errors. ` +
              `Occurred ${getSdkLoadCount()} times.`);
  } else {
    // We're running in the host page, iFrame of the host page, or popup window
    // Load OneSignal's web SDK
    if (typeof OneSignal !== "undefined")
      var predefinedOneSignalPushes = OneSignal;

    require("expose?OneSignal!./OneSignal.js");

    if (predefinedOneSignalPushes)
      OneSignal._processPushes(predefinedOneSignalPushes);
  }
}
else if (Environment.isServiceWorker()) {
  // We're running as the service worker
  require("expose?ServiceWorker!./ServiceWorker.js");
}
