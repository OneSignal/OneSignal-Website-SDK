export interface SubscriptionManagerConfig {
  safariWebId?: string;
  appId: string;
  /**
   * The VAPID public key to use for Chrome-like browsers, including Opera and Yandex browser.
   */
  vapidPublicKey?: string;
  /**
   * A globally shared VAPID public key to use for the Firefox browser, which does not use
   * VAPID for authentication but for application identification and uses a single
   */
  onesignalVapidPublicKey?: string;
}
