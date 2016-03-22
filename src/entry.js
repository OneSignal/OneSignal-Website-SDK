import { DEV_HOST, PROD_HOST, API_URL } from './vars.js';
import Environment from './environment.js';


if (Environment.isBrowser()) {
  // We're running in the host page, iFrame of the host page, or popup window
  // Load OneSignal's web SDK
  if (typeof OneSignal !== "undefined")
    var predefinedOneSignalPushes = OneSignal;

  require("expose?OneSignal!./OneSignal.js");

  if (predefinedOneSignalPushes)
    OneSignal._processPushes(predefinedOneSignalPushes);
}
else if (Environment.isServiceWorker()) {
  // We're running as the service worker
  require("expose?ServiceWorker!./ServiceWorker.js");
}
