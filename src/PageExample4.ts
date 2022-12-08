// Option 3 - Have window.OneSignalCreate return null if browser not supported.

/** SDK code */
// The full SDK, OnSignal.ts
class OneSignal {
  public static create(): OneSignal | undefined {
      if (!isSupportedBrowser) {
        return undefined;
      }
      window.document.addScript("...ES6.js");
      return OneSignal;
  }

  // public supportBrowser(): boolean; // unlike the other options OneSignalCreate handles this
  //   * It will return undifined or this OneSignal class
  public static User: User;
}

/**  Customer's page Example code */
// 1. Customer addes page SDK to their site
//   * It async so it wouldn't be loaded when we access it.
// <script async src="https://onesignal.com/sdks/v2/OneSignalPageSDK.js">

// 2. Since OneSignalCreate isn't defined yet we do the async trick of makging an array.
window.OneSignalArray = window.OneSignalArray || [];
let oneSignal: OneSignal?;
window.OneSignalArray.push(function() {
  // 3. OneSignalPageSDK.js ha sbeen loaded, now we can get the real SDK.
  oneSignal = await window.OneSignal.create();
});

window.OneSignalArray.push(function() {
    // We have to wait on the await window.OneSignalCreate.create(), otherwise oneSignal will always be null
    oneSignal?.init({appId: "..."});
    // TS will require cast, or using a different var
    oneSignal?.user.login()
});