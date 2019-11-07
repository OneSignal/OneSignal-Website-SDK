// This is used by the OneSignalSDK.js shim
// DO NOT add other imports since it is an ES5 target and dead code imports can't be clean up.

// Checks if the browser supports push notifications by checking if specific
//   classes and properties on them exist
export function isPushNotificationsSupported() {
  return supportsVapidPush() || supportsSafariPush();
}

// Does the browser support Safari's proprietary push
// NOTE: Returns false in a ServiceWorker context
function supportsSafariPush(): boolean {
  if (typeof window.safari !== "undefined" &&
      typeof window.safari.pushNotification !== "undefined") {
    return true;
  }

  // Fallback detection for Safari on macOS in an iframe context
  return window.top !== window && // isContextIframe
         navigator.vendor === "Apple Computer, Inc." && // isSafari
         navigator.platform === "MacIntel"; // isMacOS
}

// Does the browser support the standard Push API
function supportsVapidPush(): boolean {
  return typeof PushSubscriptionOptions !== "undefined" &&
         PushSubscriptionOptions.prototype.hasOwnProperty("applicationServerKey");
}

/* Notes on browser results which lead the logic of the functions above */
// Safari
//   macOS - typeof safari.pushNotification == "object"
//         - iframe context - typeof safari == "undefined"
//   iOS -  typeof safari == "undefined"
// Chrome
//   HTTP & HTTPS - typeof PushSubscriptionOptions == "function"
//   HTTP - navigator.serviceWorker == "undefined"
// Firefox
//   Normal - typeof PushSubscriptionOptions == "function"
//     HTTP & HTTPS - typeof PushSubscriptionOptions == "function"
//   ESR - typeof PushSubscriptionOptions == "undefined"
