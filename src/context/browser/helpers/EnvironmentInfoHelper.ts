import bowser from "bowser";
import { EnvironmentInfo } from '../models/EnvironmentInfo';
import { Browser } from '../models/Browser';
import { OneSignalUtils } from '../../../utils/OneSignalUtils';
import { isMacOSSafariInIframe } from '../utils/BrowserSupportsPush';
import Utils from '../../shared/utils/Utils';

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
        if (bowser.chrome) { return Browser.Chrome; }
        if (bowser.msedge) { return Browser.Edge; }
        if (bowser.opera) { return Browser.Opera; }
        if (bowser.firefox) { return Browser.Firefox; }
        // use existing safari detection to be consistent
        if (this.isMacOSSafari()) { return Browser.Safari; }

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
        return Utils.parseVersionString(bowser.version);
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

    private static getOsVersion(): string|number {
        return bowser.osversion;
    }

    private static canTalkToServiceWorker(): boolean {
        return window.isSecureContext;
    }
}
