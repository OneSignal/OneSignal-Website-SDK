export enum WindowEnvironmentKind {
  /**
   * A service worker environment.
   */
  ServiceWorker = <any>'ServiceWorker',

  /**
   * The top-level frame to the "main" client's site.
   */
  Host = <any>'Host',

  /**
   * Our subscription popup for alt-origin sites.
   */
  OneSignalSubscriptionPopup = <any>'Popup',

  /**
   * Our subscription modal for HTTPS sites, which loads in an iFrame.
   */
  OneSignalSubscriptionModal = <any>'Modal',

  /**
   * Our subscription helper iFrame.
   */
  OneSignalProxyFrame = <any>'ProxyFrame',

  /**
   * A custom iFrame on the site.
   */
  CustomIframe = <any>'CustomFrame',

  /**
   * An unknown window context type not matching any of the above.
   */
  Unknown = <any>'Unknown'
}
