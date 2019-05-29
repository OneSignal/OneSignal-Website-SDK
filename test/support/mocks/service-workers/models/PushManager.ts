import PushSubscription from './PushSubscription';
import PushSubscriptionOptions from './PushSubscriptionOptions';

/**
 * The PushManager interface of the Push API provides a way to receive notifications from
 * third-party servers as well as request URLs for push notifications.
 */
export default class PushManager {
  private subscription: PushSubscription | null;

  constructor() {
    this.subscription = null;
  }

  /**
   * Retrieves an existing push subscription. It returns a Promise that resolves to a
   * PushSubscription object containing details of an existing subscription. If no existing
   * subscription exists, this resolves to a null value.
   */
  public async getSubscription(): Promise<PushSubscription | null> {
    return this.subscription;
  }

  /**
   * Returns a Promise that resolves to the permission state of the current PushManager, which will
   * be one of 'granted', 'denied', or 'prompt'.
   */
  public async permissionState(): Promise<NotificationPermission> {
    return 'granted';
  }

  /**
   * Subscribes to a push service. It returns a Promise that resolves to a PushSubscription object
   * containing details of a push subscription. A new push subscription is created if the current
   * service worker does not have an existing subscription.
   */
  public async subscribe(options: PushSubscriptionOptions): Promise<PushSubscription> {
    if (this.subscription) {
      if (this.subscription.options.applicationServerKey != options.applicationServerKey) {
        // Simulate browser throwing if you don't unsubscribe first if applicationServerKey has changed.
        throw {
          name: "InvalidStateError",
          message: "Can not change keys without calling unsubscribe first!"
        };
      }
    }
    this.subscription = new PushSubscription(this, options);
    return this.subscription;
  }

  /**
   * Only to be used internally from PushSubscription.unsubscribe().
   */
  public __unsubscribe() {
    if (!this.subscription) {
      throw new Error("No Existing subscription!");
    }
    this.subscription = null;
  }
}
