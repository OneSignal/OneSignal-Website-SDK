import { base64ToUint8Array } from '../../../../../src/utils/Encoding';
export default class PushSubscriptionOptions {

  public static SENDER_ID = 315841957186;
  public static VAPID_PUBLIC_KEY = 'BAdXhdGDgXJeJadxabiFhmlTyF17HrCsfyIj3XEhg1j-RmT2wXU3lHiBqPSKSotvtfejZlAaPywJ9E-7AxXQBj4';
  public applicationServerKey: ArrayBuffer;
  public userVisibleOnly: boolean;

  constructor() {
    this.userVisibleOnly = true;
    this.applicationServerKey = null;
  }

  public static getAsVapidSubscription(applicationServerKey) {
    const options = new PushSubscriptionOptions();
    options.applicationServerKey = applicationServerKey ? applicationServerKey : base64ToUint8Array(PushSubscriptionOptions.VAPID_PUBLIC_KEY).buffer;
    return options;
  }

  public static getAsFcmSubscription(applicationServerKey) {
    const options = new PushSubscriptionOptions();
    options.applicationServerKey = applicationServerKey ? applicationServerKey : new (window as any).TextEncoder("utf8").encode(PushSubscriptionOptions.SENDER_ID);
    return options;
  }
}
