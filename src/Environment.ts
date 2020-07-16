import SdkEnvironment from './managers/SdkEnvironment';
import { WindowEnvironmentKind } from './models/WindowEnvironmentKind';
import bowser from 'bowser';

export default class Environment {
  /**
   * True if not in a service worker environment.
   */
  public static isBrowser() {
    return typeof window !== 'undefined';
  }

  public static isSafari(): boolean {
    return Environment.isBrowser() && bowser.safari;
  }

  public static version() {
    return (typeof __VERSION__ === "undefined" ? 1 : Number(__VERSION__));
  }

  public static get TRADITIONAL_CHINESE_LANGUAGE_TAG() {
    return ['tw', 'hant']
  }

  public static get SIMPLIFIED_CHINESE_LANGUAGE_TAG() {
    return ['cn', 'hans']
  }

  /* Specifications: https://tools.ietf.org/html/bcp47 */
  public static getLanguage() {
    let languageTag = navigator.language;
    if (languageTag) {
      languageTag = languageTag.toLowerCase();
      let languageSubtags = languageTag.split('-');
      if (languageSubtags[0] == 'zh') {
        // The language is zh-?
        // We must categorize the language as either zh-Hans (simplified) or zh-Hant (traditional); OneSignal only supports these two Chinese variants
        for (let traditionalSubtag of Environment.TRADITIONAL_CHINESE_LANGUAGE_TAG) {
          if (languageSubtags.indexOf(traditionalSubtag) !== -1) {
            return 'zh-Hant';
          }
        }
        for (let simpleSubtag of Environment.SIMPLIFIED_CHINESE_LANGUAGE_TAG) {
          if (languageSubtags.indexOf(simpleSubtag) !== -1) {
            return 'zh-Hans';
          }
        }
        return 'zh-Hant'; // Return Chinese traditional by default
      } else {
        // Return the language subtag (it can be three characters, so truncate it down to 2 just to be sure)
        return languageSubtags[0].substring(0, 2);
      }
    } else {
      return 'en';
    }
  }

  public static supportsServiceWorkers() {
    const env = SdkEnvironment.getWindowEnv();

    switch (env) {
      case WindowEnvironmentKind.ServiceWorker:
        return true;
      default:
        return typeof navigator !== "undefined" &&
          'serviceWorker' in navigator;
    }
  }

  /*
    Returns the MD5 hash of all stylesheets within the src/stylesheets
    directory.
   */
  public static getSdkStylesVersionHash() {
    return (typeof __SRC_STYLESHEETS_MD5_HASH__ === "undefined" ? '2' : __SRC_STYLESHEETS_MD5_HASH__);
  }
}
