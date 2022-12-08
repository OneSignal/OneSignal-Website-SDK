// Option 6 - Object with flags for execution conditions given to window.OneSignalDeferred

/** SDK code */
// The full SDK, OnSignal.ts
class OneSignal {
  public static User: User;
  // ...
}

/**  Customer's page Example code */
// 1. Customer adds OneSignal pageSDK to their site.
//   * Defer loading the .js file, delays until DOM is fully load
// <script defer src="https://onesignal.com/sdks/v16/OneSignalPageSDK.js">

// 2. Since OneSignalDeferred isn't defined yet we do the async/defer trick of makging an array.
window.OneSignalDeferred = window.OneSignalDeferred || [];
// Function runs if the OneSignal SDK supports the browser. 
window.OneSignalDeferred.push(
  function(oneSignal: OneSignal) {
    oneSignal.init({ appId: "..." });
    oneSignal.User.login("myId");
});

window.OneSignalDeferred.push({
  conditions: { supportsBrowser: false },
  perform: function() {
    // Take any actions needed if the browser is NOT supported by the OneSignal SDK.
  }
});

window.OneSignalDeferred.push({
  conditions: { supportsPush: false },
  perform: function() {
    // Take any actions needed if Web Push Notifications are NOT supported by the browser.
  }
});

// NOTE: supportsBrowser and supportsPush would be the same for now, until we can make our SDK not require the pushAPI.
//         * Could be useful for iOS devices (pre-web push support) but they want to collect Email and SMS