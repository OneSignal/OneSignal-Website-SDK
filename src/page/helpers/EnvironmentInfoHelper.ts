import bowser from 'bowser';
import { EnvironmentInfo } from '../models/EnvironmentInfo';
import { Browser } from '../../shared/models/Browser';
import { isMacOSSafariInIframe } from '../utils/BrowserSupportsPush';
import Utils from '../../shared/context/Utils';
import { bowserCastle } from '../../shared/utils/bowserCastle';

/**
 * EnvironmentInfoHelper is used to save page ("browser") context environment information to
 * the OneSignal object upon initialization
 */

export class EnvironmentInfoHelper {
  public static getEnvironmentInfo(): EnvironmentInfo {
    return {
      browserType: this.getBrowser(),
      browserVersion: this.getBrowserVersion(),
      isHttps: this.isHttps(),
      isUsingSubscriptionWorkaround: false,
      isBrowserAndSupportsServiceWorkers: this.supportsServiceWorkers(),
      requiresUserInteraction: this.requiresUserInteraction(),
      osVersion: this.getOsVersion(),
      canTalkToServiceWorker: this.canTalkToServiceWorker(),
    };
  }

  private static getBrowser(): Browser {
    if (bowserCastle().name === 'chrome') {
      return Browser.Chrome;
    }
    if (bowserCastle().name === 'msedge') {
      return Browser.Edge;
    }
    if (bowserCastle().name === 'opera') {
      return Browser.Opera;
    }
    if (bowserCastle().name === 'firefox') {
      return Browser.Firefox;
    }
    // use existing safari detection to be consistent
    if (this.isMacOSSafari()) {
      return Browser.Safari;
    }

    return Browser.Other;
  }

  // NOTE: Returns false in a ServiceWorker context
  private static isMacOSSafari(): boolean {
    if (typeof window.safari !== 'undefined') {
      return true;
    }

    return isMacOSSafariInIframe();
  }

  private static getBrowserVersion(): number {
    return Utils.parseVersionString(bowserCastle().version);
  }

  private static isHttps(): boolean {
    return window
      ? window.location && window.location.protocol === 'https:'
      : false;
  }

  private static supportsServiceWorkers(): boolean {
    return window.navigator && 'serviceWorker' in window.navigator;
  }

  private static requiresUserInteraction(): boolean {
    // Firefox 72+ requires user-interaction
    if (this.getBrowser() === 'firefox' && this.getBrowserVersion() >= 72) {
      return true;
    }

    // Safari 12.1+ requires user-interaction
    if (this.getBrowser() === 'safari' && this.getBrowserVersion() >= 12.1) {
      return true;
    }

    return false;
  }

  private static getOsVersion(): string | number {
    return bowser.osversion;
  }

  private static canTalkToServiceWorker(): boolean {
    return !!window.isSecureContext;
  }
}
