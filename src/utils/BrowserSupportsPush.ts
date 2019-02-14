// This is used by the OneSignalSDK.js shim
// DO NOT add other imports since it is an ES5 target and dead code imports can't be clean up.

import { IBowser } from "bowser";
import bowser from "bowser";

export function redetectBrowserUserAgent(): IBowser {
  /*
   TODO: Make this a little neater
   During testing, the browser object may be initialized before the userAgent is injected
  */
  let browser: IBowser;
  if (bowser.name === '' && bowser.version === '') {
    browser = bowser._detect(navigator.userAgent);
  } else {
    browser = bowser;
  }
  return browser;
}

export function isPushNotificationsSupported() {
  const browser = redetectBrowserUserAgent();
  const userAgent = navigator.userAgent || '';

  // Chrome 69+ returns undefined for serviceWorker in insecure context but our workaround will work.
  // Returning true.
  if ((browser.chrome || (<any>browser).chromium) &&
    window.isSecureContext === false && typeof navigator.serviceWorker === "undefined") {
    return true;
  }

  /* Firefox on Android push notifications not supported until at least 48:
  // https://bugzilla.mozilla.org/show_bug.cgi?id=1206207#c6 */
  if (browser.firefox && Number(browser.version) < 48 && (browser.mobile || browser.tablet)) {
    return false;
  }

  if (browser.firefox && Number(browser.version) >= 44) {
    // check for Firefox Extended Support Release (ESR)
    // thanks to https://stackoverflow.com/questions/42674004/how-to-detect-difference-between-firefox-and-firefox-esr-in-javascript
    const esrBuildIds = [
      "20160725105554", "20160905130425", "20161031153904", "20161129180326", "20161209150850", "20170118123525",
      "20170227085837", "20170227131422", "20170301181722", "20170303022339", "20170316213902", "20170323110425",
      "20170410145022", "20170411115307", "20170412142208", "20170417065206", "20170504112025", "20170517122419",
      "20170607123825", "20170627155318", "20170801170322", "20170802111520", "20170917103825", "20170921064520",
      "20171005074949", "20171106172903", "20171107091003", "20171128121223", "20171206101620", "20171226003912",
      "20180116134019", "20180118122319", "20180307131617", "20180313134936", "20180315163333", "20180322140748",
      "20180426000307", "20180427183532", "20180427222832", "20180430140610", "20180503092946", "20180503164101",
      "20180516032417", "20180605153619", "20180605174236", "20180605201706", "20180619102821", "20180619173714",
      "20180621064021", "20180621121604", "20180830204350", "20180903060751", "20180920175354", "20181001135620",
      "20181017185317", "20181203164059", "20190121141556", "20190124141046", "20190211182645"
    ];
    if (esrBuildIds.indexOf((navigator as any).buildID) > -1) {
      return false;
    }
    return true;
  }

  if (!browser.safari && typeof navigator.serviceWorker === "undefined") {
    return false;
  }

  if (browser.ios || (<any>browser).ipod || (<any>browser).iphone || (<any>browser).ipad) {
    return false;
  }

  if (browser.msie) {
    return false;
  }

  // Microsoft Edge
  if (browser.msedge && Number(browser.version) >= 17.17063) {
    return true;
  }

  // Facebook in-app browser
  if ((userAgent.indexOf("FBAN") > -1) || (userAgent.indexOf("FBAV") > -1)) {
    return false;
  }

  // Android Chrome WebView
  if (navigator.appVersion.match(/ wv/)) {
    return false;
  }

  if (browser.safari && Number(browser.version) >= 7.1) {
    return true;
  }

  // Web push is supported in Samsung Internet for Android 4.0+
  // http://developer.samsung.com/internet/android/releases
  if ((browser as any).samsungBrowser && Number(browser.version) >= 4) {
    return true;
  }

  if ((browser.chrome || (<any>browser).chromium) && Number(browser.version) >= 42) {
    return true;
  }

  if ((<any>browser).yandexbrowser && Number(browser.version) >= 15.12)
  // 17.3.1.838 supports VAPID on Mac OS X
    return true;

  // https://www.chromestatus.com/feature/5416033485586432
  if (browser.opera && (browser.mobile || browser.tablet) && Number(browser.version) >= 37 ||
    browser.opera && Number(browser.version) >= 42)
    return true;

  // The earliest version of Vivaldi uses around Chrome 50
  if ((browser as any).vivaldi)
    return true;

  return false;
}
