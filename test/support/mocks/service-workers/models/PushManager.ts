import PushSubscription from './PushSubscription';

// https://developer.mozilla.org/en-US/docs/Web/API/PushManager
export default class PushManager {
  public subscription: PushSubscription;
  public static GCM_SENDER_ID = 121212121212;

  constructor() {
    this.subscription = null;
  }

  async getSubscription(): Promise<PushSubscription> {
    return this.subscription;
  }

  async permissionState(): Promise<NotificationPermission> {
    return 'granted';
  }

  async subscribe(options: PushSubscriptionOptions): Promise<PushSubscription> {
    if (options.applicationServerKey && options.applicationServerKey.byteLength >= 65) {
      // A VAPID subscription
      this.subscription = PushSubscription.getAsVapidSubscription(this, options.applicationServerKey);
    } else {
      this.subscription = PushSubscription.getAsFcmSubscription(this, PushManager.GCM_SENDER_ID);
    }
    return this.subscription;
  }
}
