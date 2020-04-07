import { AppConfig } from '../models/AppConfig';
import { EnvironmentKind } from '../models/EnvironmentKind';
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

    const preferredAfterUnsubscribes = 
      await AltOriginManager.removeDuplicatedAltOriginSubscription(allProxyFrameHosts);
    if (preferredAfterUnsubscribes) {
      return preferredAfterUnsubscribes;
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

  /*
  * If the user is subscribed to more than OneSignal subdomain (AKA HTTP setup)
  * unsubscribe them from ones lower in the list.
  * Example: Such as being being subscribed to mysite.os.tc & mysite.onesignal.com
  * 
  * Returns null if no actions we taken.
  * Returns the remaining subscribed ProxyFrameHost if there were duplicate(s)
  *    that were subscribed.
  */
  static async removeDuplicatedAltOriginSubscription(
    proxyFrameHosts: ProxyFrameHost[]
  ): Promise<null | ProxyFrameHost> {
    const subscribedProxyFrameHosts: ProxyFrameHost[] = [];
    for (const proxyFrameHost of proxyFrameHosts) {
      if (await proxyFrameHost.isSubscribed()) {
        subscribedProxyFrameHosts.push(proxyFrameHost);
      }
    }

    // Not subscribed or subscribed to just one domain, nothing to do, no duplicates
    if (subscribedProxyFrameHosts.length < 2) {
      return null;
    }

    // At this point we have 2+ subscriptions
    // Keep only the first (highest priority) domain and unsubscribe the rest.
    const preferredAfterUnsubscribes = subscribedProxyFrameHosts[0];
    const toUnsubscribeProxyFrameHosts = subscribedProxyFrameHosts.slice(1);
    for (const subscribedHost of toUnsubscribeProxyFrameHosts) {
      await subscribedHost.unsubscribeFromPush();
      subscribedHost.dispose();
    }
    return preferredAfterUnsubscribes;
  }

  /**
   * Only used for sites using a OneSignal subdomain (AKA HTTP setup).
   * 
   * Returns the array of possible URL in which the push subscription and
   * IndexedDb site data will be stored.
   *
   * This URL was typically subdomain.onesignal.com, until we switched
   * to subdomain.os.tc for a shorter origin to fit into Mac's native
   * notifications on Chrome 59+.
   *
   * Because a user may be subscribed to subdomain.onesignal.com or
   * subdomain.os.tc, we have to load both in certain scenarios to determine
   * which the user is subscribed to; hence, this method returns an array of
   * possible URLs.
   * 
   * Order of URL is in priority order of one should be used.
   */
  static getCanonicalSubscriptionUrls(config: AppConfig,
                                      buildEnv: EnvironmentKind = SdkEnvironment.getApiEnv()
                                     ): Array<URL> {
    const apiUrl = SdkEnvironment.getOneSignalApiUrl(buildEnv);
    const legacyDomainUrl = new URL(`https://${config.subdomain}.${apiUrl.host}`);

    // Staging and Dev don't support going through the os.tc domain
    if (buildEnv !== EnvironmentKind.Production) {
      return [legacyDomainUrl];
    }

    // Use os.tc as a first pick
    const urls = [new URL(`https://${config.subdomain}.os.tc`)];

    if (config.httpUseOneSignalCom) {
      urls.push(legacyDomainUrl);
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
