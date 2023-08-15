import ProxyFrameHost from '../modules/frames/ProxyFrameHost';
import SdkEnvironment from '../../shared/managers/SdkEnvironment';
import { Utils } from '../../shared/context/Utils';
import { AppConfig } from '../../shared/models/AppConfig';
import { EnvironmentKind } from '../../shared/models/EnvironmentKind';

export default class AltOriginManager {

  constructor() {

  }

  /*
  * This loads all possible iframes that a site could be subscribed to
  * (os.tc & onesignal.com) then checks to see we are subscribed to any.
  * If we find what we are subscribed to both unsubscribe from onesignal.com.
  * This method prefers os.tc over onesignal.com where possible.
  */
  static async discoverAltOrigin(appConfig: AppConfig): Promise<ProxyFrameHost> {
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
    } else {
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
    const subscriptionDomain = AltOriginManager.getWildcardLegacySubscriptionDomain(buildEnv);
    const legacyDomainUrl = new URL(`https://${config.subdomain}.${subscriptionDomain}`);

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
   * Get the wildcard part of the legacy subscription domain.
   * Examples: onesignal.com, staging.onesignal.com, or localhost
   */
  static getWildcardLegacySubscriptionDomain(buildEnv: EnvironmentKind): string {
    const apiUrl = SdkEnvironment.getOneSignalApiUrl(buildEnv);

    // Prod and Dev support domains like *.onesignal.com and *.localhost 
    let envSubdomainParts: number = 2;
    if (buildEnv === EnvironmentKind.Staging) {
      // Allow up to 3 parts so *.staging.onesignal.com works.
      envSubdomainParts = 3;
    }

    return Utils.lastParts(apiUrl.host, ".", envSubdomainParts);
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
}
