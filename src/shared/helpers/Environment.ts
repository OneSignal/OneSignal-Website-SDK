import { supportsVapidPush } from '../../page/utils/BrowserSupportsPush';
import SdkEnvironment from '../managers/SdkEnvironment';
import { WindowEnvironmentKind } from '../models/WindowEnvironmentKind';
import { bowserCastle } from '../utils/bowserCastle';
import { EnvVariables } from '../utils/EnvVariables';

export default class Environment {
  /**
   * True if not in a service worker environment.
   */
  public static isBrowser() {
    return typeof window !== 'undefined';
  }

  // Prefer Legacy Safari if API is available over VAPID until Safari
  // fixes issues with it.
  public static useSafariLegacyPush(): boolean {
    return this.isBrowser() && window.safari?.pushNotification != undefined;
  }

  // This is the counter part to useSafariLegacyPush(); as it notes only use
  // Safari VAPID if it doesn't have legacy Safari push.
  public static useSafariVapidPush(): boolean {
    return (
      bowserCastle().name == 'safari' &&
      supportsVapidPush() &&
      !this.useSafariLegacyPush()
    );
  }

  public static version() {
    return EnvVariables.VERSION();
  }

  public static get TRADITIONAL_CHINESE_LANGUAGE_TAG() {
    return ['tw', 'hant'];
  }

  public static get SIMPLIFIED_CHINESE_LANGUAGE_TAG() {
    return ['cn', 'hans'];
  }

  /* Specifications: https://tools.ietf.org/html/bcp47 */
  public static getLanguage() {
    let languageTag = navigator.language;
    if (languageTag) {
      languageTag = languageTag.toLowerCase();
      const languageSubtags = languageTag.split('-');
      if (languageSubtags[0] == 'zh') {
        // The language is zh-?
        // We must categorize the language as either zh-Hans (simplified) or zh-Hant (traditional);
        // OneSignal only supports these two Chinese variants
        for (const traditionalSubtag of Environment.TRADITIONAL_CHINESE_LANGUAGE_TAG) {
          if (languageSubtags.indexOf(traditionalSubtag) !== -1) {
            return 'zh-Hant';
          }
        }
        for (const simpleSubtag of Environment.SIMPLIFIED_CHINESE_LANGUAGE_TAG) {
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
        return typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
    }
  }
}
