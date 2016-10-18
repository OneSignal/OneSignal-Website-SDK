import { contains } from './utils.js';

export default class Environment {
  static get SERVICE_WORKER() {
    return 'ServiceWorker';
  }

  static get HOST() {
    return "host";
  }

  static get POPUP() {
    return "popup";
  }

  static get IFRAME() {
    return "iFrame";
  }

  static getEnv() {
    if (typeof window === "undefined") {
      if (typeof WorkerLocation !== "undefined" && location instanceof WorkerLocation)
        return Environment.SERVICE_WORKER;
    }
    else {
      // If the window is the root top-most level
      if (window === window.top) {
        if (contains(location.href, "initOneSignal") ||
            (location.pathname === '/subscribe' && location.search === ''))
          return Environment.POPUP;
        else
          return Environment.HOST;
      }
      else if (location.pathname === '/webPushIframe' ||
               location.pathname === '/webPushModal') {
        return Environment.IFRAME;
      }
      else return Environment.CUSTOM_SUBDOMAIN;
    }
  }

  static isServiceWorker() {
    return Environment.getEnv() === Environment.SERVICE_WORKER;
  }

  /**
   * The main site page.
   */
  static isHost() {
    return Environment.getEnv() === Environment.HOST;
  }

  /**
   * The HTTP popup asking users using our subdomain workaround to subscribe,
   */
  static isPopup() {
    return Environment.getEnv() === Environment.POPUP;
  }

  static get CUSTOM_SUBDOMAIN() {
    return "custom_subdomain";
  }

  /**
   * The HTTPS iFrame we put on HTTP sites to communicate with the service worker and IndexedDB.
   * @returns {boolean}
   */
  static isIframe() {
    return Environment.getEnv() === Environment.IFRAME;
  }

  /**
   * True if not in a service worker environment.
   */
  static isBrowser() {
    return typeof window !== 'undefined';
  }

  static isDev() {
    return __DEV__;
  }

  static isTest() {
    return __TEST__;
  }

  static isCustomSubdomain() {
       return Environment.getEnv() === Environment.CUSTOM_SUBDOMAIN;
  }

  static get TRADITIONAL_CHINESE_LANGUAGE_TAG() {
    return ['tw', 'hant']
  }

  static get SIMPLIFIED_CHINESE_LANGUAGE_TAG() {
    return ['cn', 'hans']
  }

  /* Specifications: https://tools.ietf.org/html/bcp47 */
  static getLanguage(testLanguage) {
    let languageTag = testLanguage || navigator.language;
    if (languageTag) {
      languageTag = languageTag.toLowerCase();
      let languageSubtags = languageTag.split('-');
      if (languageSubtags[0] == 'zh') {
        // The language is zh-?
        // We must categorize the language as either zh-Hans (simplified) or zh-Hant (traditional); OneSignal only supports these two Chinese variants
        for (let traditionalSubtag of Environment.TRADITIONAL_CHINESE_LANGUAGE_TAG) {
          if (contains(languageSubtags, traditionalSubtag)) {
            return 'zh-Hant';
          }
        }
        for (let simpleSubtag of Environment.SIMPLIFIED_CHINESE_LANGUAGE_TAG) {
          if (contains(languageSubtags, simpleSubtag)) {
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
}