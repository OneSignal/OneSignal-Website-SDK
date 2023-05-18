import { EnvironmentInfo } from '../models/EnvironmentInfo';
import { Browser } from '../../shared/models/Browser';
import { OneSignalUtils } from '../../shared/utils/OneSignalUtils';
import { isMacOSSafariInIframe } from '../utils/BrowserSupportsPush';
import Utils from '../../shared/context/Utils';
import Bowser from "bowser";
import bowserCastle from 'bowser-castle';

/**
 * EnvironmentInfoHelper is used to save page ("browser") context environment information to
 * the OneSignal object upon initialization
 */

export class EnvironmentInfoHelper {
    public static getEnvironmentInfo() : EnvironmentInfo {
        return {
            browserType: this.getBrowser(),
            browserVersion: this.getBrowserVersion(),
            isHttps: this.isHttps(),
            isUsingSubscriptionWorkaround: this.isUsingSubscriptionWorkaround(),
            isBrowserAndSupportsServiceWorkers: this.supportsServiceWorkers(),
            requiresUserInteraction: this.requiresUserInteraction(),
            osVersion: this.getOsVersion(),
            canTalkToServiceWorker: this.canTalkToServiceWorker()
        };
    }

    private static getBrowser(): Browser {
      if (this.isMacOSSafari()) { return Browser.Safari; }
      // if bowserCastle().name is in Broser enum, return it
      if (bowserCastle().name && bowserCastle().name in Browser) {
          return bowserCastle().name as Browser;
      }

      return Browser.Other;
    }

    // NOTE: Returns false in a ServiceWorker context
    private static isMacOSSafari(): boolean {
        if (typeof window.safari !== "undefined") {
            return true;
        }

        return isMacOSSafariInIframe();
    }

    private static getBrowserVersion(): number {
      if (!bowserCastle().version) {
        throw new Error("bowserCastle().version is not defined");
      }

      return Utils.parseVersionString(bowserCastle().version);
    }

    private static isHttps(): boolean {
        return window ? (window.location && window.location.protocol === 'https:') : false;
    }

    private static isUsingSubscriptionWorkaround(): boolean {
        return OneSignalUtils.isUsingSubscriptionWorkaround();
    }

    private static supportsServiceWorkers(): boolean {
        return (window.navigator && 'serviceWorker' in window.navigator);
    }

    private static requiresUserInteraction(): boolean {
        // Firefox 72+ requires user-interaction
        if (this.getBrowser() === "firefox" && this.getBrowserVersion() >= 72) {
            return true;
        }

        // Safari 12.1+ requires user-interaction
        if (this.getBrowser() === "safari" && this.getBrowserVersion() >= 12.1) {
            return true;
        }

        return false;
    }

    private static getOsVersion(): string {
        const osInfo = Bowser.getParser(window.navigator.userAgent).getOS();
        return osInfo.version ?? 'Unknown';
    }

    private static canTalkToServiceWorker(): boolean {
        return !!window.isSecureContext;
    }
}
