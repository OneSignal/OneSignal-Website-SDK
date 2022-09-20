export enum WindowEnvironmentKind {
  /**
   * A service worker environment.
   */
  ServiceWorker = 'ServiceWorker',

  /**
   * The top-level frame to the "main" client's site.
   */
  Host = 'Host',

  /**
   * Our subscription popup for alt-origin sites.
   */
  OneSignalSubscriptionPopup = 'Popup',

  /**
   * Our subscription modal for HTTPS sites, which loads in an iFrame.
   */
  OneSignalSubscriptionModal = 'Modal',

  /**
   * Our subscription helper iFrame.
   */
  OneSignalProxyFrame = 'ProxyFrame',

  /**
   * A custom iFrame on the site.
   */
  CustomIframe = 'CustomFrame',

  /**
   * An unknown window context type not matching any of the above.
   */
  Unknown = 'Unknown'
}
