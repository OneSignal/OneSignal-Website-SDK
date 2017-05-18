import SubscriptionHelper from '../helpers/SubscriptionHelper';
import { AppConfig } from '../models/AppConfig';
import SdkEnvironment from './SdkEnvironment';
import { BuildEnvironmentKind } from '../models/BuildEnvironmentKind';
import { InvalidStateError, InvalidStateReason } from '../errors/InvalidStateError';
import OneSignalApi from '../OneSignalApi';
import { Uuid } from '../models/Uuid';
import Database from '../services/Database';
import ProxyFrameHost from '../modules/frames/ProxyFrameHost';
import { contains } from '../utils';
import * as log from 'loglevel';

export default class AltOriginManager {

  constructor() {

  }

  static async discoverAltOrigin(appConfig): Promise<ProxyFrameHost> {
    const iframeUrls = AltOriginManager.getOneSignalProxyIframeUrls(appConfig);
    for (const iframeUrl of iframeUrls) {
      const proxyFrameHost = new ProxyFrameHost(iframeUrl);
      // A TimeoutError could happen here; it gets rejected out of this entire loop
      await proxyFrameHost.load();
      if (await proxyFrameHost.isSubscribed()) {
        // If we're subscribed, we're done searching for the iframe
        return proxyFrameHost;
      } else {
        if (contains(proxyFrameHost.url.host, '.os.tc')) {
          // We've already loaded .onesignal.com and they're not subscribed
          // There's no other frames to check; the user is completely not subscribed
          return proxyFrameHost;
        } else {
          // We've just loaded .onesignal.com and they're not subscribed
          // Load the .os.tc frame next to check
          // Remove the .onesignal.com frame; there's no need to keep it around anymore
          log.debug(`Loaded ${proxyFrameHost.url.host} iFrame, but the user was not subscribed.`);
          proxyFrameHost.dispose();
          continue;
        }
      }
    }
  }

  /**
   * Returns the array of possible URL in which the push subscription and
   * IndexedDb site data will be stored.
   *
   * For native HTTPS sites not using a subdomain of our service, this is the
   * top-level URL.
   *
   * For sites using a subdomain of our service, this URL was typically
   * subdomain.onesignal.com, until we switched to subdomain.os.tc for a shorter
   * origin to fit into Mac's native notifications on Chrome 59+.
   *
   * Because a user may be subscribed to subdomain.onesignal.com or
   * subdomain.os.tc, we have to load both in certain scenarios to determine
   * which the user is subscribed to; hence, this method returns an array of
   * possible URLs.
   */
  static getCanonicalSubscriptionUrls(config: AppConfig,
                                      buildEnv: BuildEnvironmentKind = SdkEnvironment.getBuildEnv()
                                     ): Array<URL> {
    let urls = [];

    if (config.httpUseOneSignalCom) {
      let legacyDomainUrl = SdkEnvironment.getOneSignalApiUrl(buildEnv);
      // Add subdomain.onesignal.com
      legacyDomainUrl.host = [config.subdomain, legacyDomainUrl.host].join('.');
      urls.push(legacyDomainUrl);
    }

    let osTcDomainUrl = SdkEnvironment.getOneSignalApiUrl(buildEnv);
    // Always add subdomain.os.tc
    osTcDomainUrl.host = [config.subdomain, 'os.tc'].join('.');
    urls.push(osTcDomainUrl);

    for (const url of urls) {
      url.pathname = '';
    }

    return urls;
  }

  /**
   * Returns the URL of the OneSignal proxy iFrame helper.
   */
  static getOneSignalProxyIframeUrls(config: AppConfig): Array<URL> {
    const urls = AltOriginManager.getCanonicalSubscriptionUrls(config);

    for (const url of urls) {
      url.pathname = 'webPushIframe';
    }

    return urls;
  }

  /**
   * Returns the URL of the OneSignal subscription popup.
   */
  static getOneSignalSubscriptionPopupUrls(config: AppConfig): Array<URL> {
    const urls = AltOriginManager.getCanonicalSubscriptionUrls(config);

    for (const url of urls) {
      url.pathname = 'subscribe';
    }

    return urls;
  }
}
