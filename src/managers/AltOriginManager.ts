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
    for (const iframeUrl of iframeUrls) {
      const proxyFrameHost = new ProxyFrameHost(iframeUrl);
      // A TimeoutError could happen here; it gets rejected out of this entire loop
      await proxyFrameHost.load();
      allProxyFrameHosts.push(proxyFrameHost);
    }

    const subscribedProxyFrameHosts = await AltOriginManager.subscribedProxyFrameHosts(allProxyFrameHosts);
    await AltOriginManager.removeDuplicatedAltOriginSubscription(subscribedProxyFrameHosts);

    let preferredProxyFrameHost: ProxyFrameHost;
    if (subscribedProxyFrameHosts.length === 0) {
      // Use the first (preferred) host (os.tc in this case) if not subscribed to any
      preferredProxyFrameHost = allProxyFrameHosts[0];
    }
    else {
      // Otherwise if their was one or more use the highest preferred one in the list
      preferredProxyFrameHost = subscribedProxyFrameHosts[0];
    }

    // Remove all other unneeded iframes from the page
    for (const proxyFrameHost of allProxyFrameHosts) {
      if (preferredProxyFrameHost !== proxyFrameHost) {
        proxyFrameHost.dispose();
      }
    }

    return preferredProxyFrameHost;
  }

  static async subscribedProxyFrameHosts(proxyFrameHosts: ProxyFrameHost[]): Promise<ProxyFrameHost[]> {
    const subscribed: ProxyFrameHost[] = [];
    for (const proxyFrameHost of proxyFrameHosts) {
      if (await proxyFrameHost.isSubscribed()) {
        subscribed.push(proxyFrameHost);
      }
    }
    return subscribed;
  }

  /*
  * If the user is subscribed to more than OneSignal subdomain (AKA HTTP setup)
  * unsubscribe them from ones lower in the list.
  * Example: Such as being being subscribed to mysite.os.tc & mysite.onesignal.com
  */
  static async removeDuplicatedAltOriginSubscription(
    subscribedProxyFrameHosts: ProxyFrameHost[]
  ): Promise<void> {
    // Not subscribed or subscribed to just one domain, nothing to do, no duplicates
    if (subscribedProxyFrameHosts.length < 2) {
      return;
    }

    // At this point we have 2+ subscriptions
    // Keep only the first (highest priority) domain and unsubscribe the rest.
    const toUnsubscribeProxyFrameHosts = subscribedProxyFrameHosts.slice(1);
    for (const dupSubscribedHost of toUnsubscribeProxyFrameHosts) {
      await dupSubscribedHost.unsubscribeFromPush();
    }
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
