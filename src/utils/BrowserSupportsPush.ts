// This is used by the OneSignalSDK.js shim
// DO NOT add other imports since it is an ES5 target and dead code imports can't be clean up.

// Checks if the browser supports push notifications by checking if specific
//   classes and properties on them exist

// Safari
//   macOS - typeof safari.pushNotification == "object"
//   iOS -  typeof safari == "undefined"
// Chrome
//   HTTP & HTTPS - typeof PushSubscriptionOptions == "function"
// Firefox
//   Normal - typeof PushSubscriptionOptions == "function"
//     HTTP & HTTPS - typeof PushSubscriptionOptions == "function"
//   ESR - typeof PushSubscriptionOptions == "undefined"

export function isPushNotificationsSupported() {
  // window.safari will be present on macOS only
  if (typeof window.safari !== "undefined") {
    return typeof window.safari.pushNotification !== "undefined";
  }

  if (typeof PushSubscriptionOptions !== "undefined") {
    // applicationServerKey required for VAPID
    return PushSubscriptionOptions.prototype.hasOwnProperty("applicationServerKey");
  }

  return false;
}
