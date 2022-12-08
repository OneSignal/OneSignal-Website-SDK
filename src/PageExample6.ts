// Option 6 - Object with flags for execution conditions given to window.OneSignalDeferred

/** SDK code */
// The full SDK, OnSignal.ts
class OneSignal {
  public static User: User;
  // ...
}

/**  Customer's page Example code */
// 1. Customer addes page SDK to their site
//   * It async so it wouldn't be loaded when we access it.
// <script defer  src="https://onesignal.com/sdks/v2/OneSignalPageSDK.js">

// 2. Since OneSignalDeferred isn't defined yet we do the async/defer trick of makging an array.
window.OneSignalDeferred = window.OneSignalDeferred || [];
window.OneSignalDeferred.push(
  // No entry here is means { supportedBrowser: true }, only run function if browser supports the OneSignal SDK
  function(oneSignal: OneSignal) {
    oneSignal.init({ appId: "..." });
    oneSignal.user.login("myId");
});

window.OneSignalDeferred.push([
  { supportedBrowser: false },
  // Function runs only if browser doesn't support the OneSignal SDK
  function() {
    // Run code make changes to site if needed.
  }
]);

window.OneSignalDeferred.push([
  { pushSupported: false },
  // Function runs only if browser doesn't support push
  function() {
    // Run code make changes to site if needed.
  }
]);

// NOTE: pushSupported and supportedBrowser would be the same for now, until we can make our SDK not require the pushAPI.
//         * Could be useful for iOS devices (pre-web push support) but they want to collect Email and SMS