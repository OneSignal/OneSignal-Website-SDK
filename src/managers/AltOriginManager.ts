import { AppConfig } from '../models/AppConfig';
import { BuildEnvironmentKind } from '../models/BuildEnvironmentKind';
import ProxyFrameHost from '../modules/frames/ProxyFrameHost';
import { contains } from '../utils';
import SdkEnvironment from './SdkEnvironment';

export default class AltOriginManager {

  constructor() {

  }

  static async discoverAltOrigin(appConfig): Promise<ProxyFrameHost> {
    const iframeUrls = AltOriginManager.getOneSignalProxyIframeUrls(appConfig);
    const allProxyFrameHosts: ProxyFrameHost[] = [];
    let targetProxyFrameHost;
    for (const iframeUrl of iframeUrls) {
      const proxyFrameHost = new ProxyFrameHost(iframeUrl);
      // A TimeoutError could happen here; it gets rejected out of this entire loop
      await proxyFrameHost.load();
      allProxyFrameHosts.push(proxyFrameHost);
    }
    const nonDuplicatedAltOriginSubscriptions = await AltOriginManager.removeDuplicatedAltOriginSubscription(allProxyFrameHosts);

    if (nonDuplicatedAltOriginSubscriptions) {
      targetProxyFrameHost = nonDuplicatedAltOriginSubscriptions[0];
    } else {
      for (const proxyFrameHost of allProxyFrameHosts) {
        if (await proxyFrameHost.isSubscribed()) {
          // If we're subscribed, we're done searching for the iframe
          targetProxyFrameHost = proxyFrameHost;
        } else {
          if (contains(proxyFrameHost.url.host, '.os.tc')) {
            if (!targetProxyFrameHost) {
              // We've already loaded .onesignal.com and they're not subscribed
              // There's no other frames to check; the user is completely not subscribed
              targetProxyFrameHost = proxyFrameHost;
            } else {
              // Already subscribed to .onesignal.com; remove os.tc frame
            proxyFrameHost.dispose();
            }
          } else {
            // We've just loaded .onesignal.com and they're not subscribed
            // Load the .os.tc frame next to check
            // Remove the .onesignal.com frame; there's no need to keep it around anymore
            // Actually don't dispose it, so we can check for duplicate subscriptions
            proxyFrameHost.dispose();
            continue;
          }
        }
      }
    }

    return targetProxyFrameHost;
  }

  static async removeDuplicatedAltOriginSubscription(proxyFrameHosts: ProxyFrameHost[]): Promise<void | ProxyFrameHost[]> {
    const subscribedProxyFrameHosts = [];
    for (const proxyFrameHost of proxyFrameHosts) {
      if (await proxyFrameHost.isSubscribed()) {
        subscribedProxyFrameHosts.push(proxyFrameHost);
      }
    }
    if (subscribedProxyFrameHosts.length < 2) {
      // If the user is only subscribed on one host, or not subscribed at all,
      // they don't have duplicate subscriptions
      return null;
    }
    if (SdkEnvironment.getBuildEnv() == BuildEnvironmentKind.Development) {
      var hostToCheck = '.localhost:3001';
    } else if (SdkEnvironment.getBuildEnv() == BuildEnvironmentKind.Production) {
      var hostToCheck = '.onesignal.com';
    }
    var oneSignalComProxyFrameHost: ProxyFrameHost = (subscribedProxyFrameHosts as any).find(proxyFrameHost => contains(proxyFrameHost.url.host, hostToCheck));
    if (!oneSignalComProxyFrameHost) {
      // They aren't subscribed to the .onesignal.com frame; shouldn't happen
      // unless we have 2 other frames in the future they can subscribe to
      return null;
    } else {
      await oneSignalComProxyFrameHost.unsubscribeFromPush();
      oneSignalComProxyFrameHost.dispose();

      const indexToRemove = proxyFrameHosts.indexOf(oneSignalComProxyFrameHost);
      proxyFrameHosts.splice(indexToRemove, 1);
      return proxyFrameHosts;
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
