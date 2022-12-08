/** SDK code */
interface OneSignal {
    public supportBrowser(): boolean;
}

// Truely is ES5 (not like the old way of detcted push support or not)
class OneSignalES5 implements OneSignal {
   // This wouldn't have the functions, expect for supportBrowser()
   public supportBrowser(): boolean {
     return false;
   }
}

class OneSignalES6 implements OneSignal {
  public supportBrowser(): boolean {
     return true;
  }
  // This has all other methods
}

class OneSignalCreate {
    public static create(): OneSignal {
        window.document.addScript("...ES6.js");
        return OneSignal;
    }
}

/**  Customer's page Example code */
// 1. Customer addes page SDK to their site
//   * It async so it wouldn't be loaded when we access it.
// <script async src="https://onesignal.com/sdks/v2/OneSignalPageSDK.js">

// 2. Since OneSignalCreate isn't defined yet we do the async trick of makging an array.
window.OneSignalCreate = window.OneSignalCreate || [];
window.OneSignalCreate.push(function() {
  // 3. OneSignalPageSDK.js ha sbeen loaded, now we can get the real SDK. 
  const oneSignal = await window.OneSignalCreate.create();
  if (oneSignal.supportBrowser()) {
      oneSignal.init({appId: "..."});
  
      // TS will require cast, or using a different var
      oneSignal.user.login()
  }
});
/** SDK code */
interface OneSignal {
    public supportBrowser(): boolean;
}

// Truely is ES5 (not like the old way of detcted push support or not)
class OneSignalES5 implements OneSignal {
   // This wouldn't have the functions, expect for supportBrowser()
   public supportBrowser(): boolean {
     return false;
   }
}

class OneSignalES6 implements OneSignal {
  public supportBrowser(): boolean {
     return true;
  }
  // This has all other methods
}

class OneSignalCreate {
    public static create(): OneSignal {
        window.document.addScript("...ES6.js");
        return OneSignal;
    }
}

/**  Customer's page Example code */
// 1. Customer addes page SDK to their site
//   * It async so it wouldn't be loaded when we access it.
// <script async src="https://onesignal.com/sdks/v2/OneSignalPageSDK.js">

// 2. Since OneSignalCreate isn't defined yet we do the async trick of makging an array.
window.OneSignalCreate = window.OneSignalCreate || [];
window.OneSignalCreate.push(function() {
  // 3. OneSignalPageSDK.js ha sbeen loaded, now we can get the real SDK. 
  const oneSignal = await window.OneSignalCreate.create();
  if (oneSignal.supportBrowser()) {
      oneSignal.init({appId: "..."});
  
      // TS will require cast, or using a different var
      oneSignal.user.login()
  }
});
