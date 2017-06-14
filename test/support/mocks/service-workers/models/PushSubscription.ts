import PushSubscriptionOptions from './PushSubscriptionOptions';
import PushManager from './PushManager';
import { base64ToUint8Array } from '../../../../../src/utils/Encoding';
// https://developer.mozilla.org/en-US/docs/Web/API/PushManager

/**
 * Represents a mock PushSubscription.
 *
 * Both mock VAPID subscriptions and mock FCM subscriptions are supported.
 */
export default class PushSubscription {

  public endpoint: string;
  public options: PushSubscriptionOptions;
  public expirationTime: null;
  private pushManager: PushManager;
  public isVapid: boolean;

  public static FCM_SUBSCRIPTION = {
    endpoint: 'https://android.googleapis.com/gcm/send/e8sXizGsZTE:APA91bH8uJxQ-KAl_cXHZ_7nZhViU9iUezu3QEMcCGcMIYIFZmECrgA11xaxOOohVz5aTqujxE_lvRlWhpk3sO4zHpN-sYliRcFlTkfjTSsfmWIF0By163M6SZYRpX8B83HmEuAyKL84',
    p256dh: 'BHxSHtYS0q3i0Tb3Ni6chC132ZDPd5uI4r-exy1KsevRqHJvOM5hNX-M83zgYjp-1kdirHv0Elhjw6Hivw1Be5M=',
    auth: '4a3vf9MjR9CtPSHLHcsLzQ=='
  };

  public static VAPID_SUBSCRIPTION = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/c0NI73v1E0Y:APA91bEN7z2weTCpJmcS-MFyfbgjtmlAWuV5YaaNw625_Rq2-f0ZrVLdRPXKGm7B3uwfygicoCeEoWQxCKIxlL3RWG2xkHs6C8-H_cxq-4Z-isAiZ3ixo84-2HeXB9eUvkfNO_t1jd5s',
    p256dh: 'BHxSHtYS0q3i0Tb3Ni6chC132ZDPd5uI4r-exy1KsevRqHJvOM5hNX-M83zgYjp-1kdirHv0Elhjw6Hivw1Be5M=',
    auth: '4a3vf9MjR9CtPSHLHcsLzQ=='
  };

  /**
   * Don't call this. Use getAsVapidSubscription() or getAsFcmSubscription().
   */
  constructor(pushManager: PushManager) {
    this.pushManager = pushManager;
  }

  public static getAsVapidSubscription(pushManager: PushManager, applicationServerKey: ArrayBuffer) {
    const subscription = new PushSubscription(pushManager);
    subscription.isVapid = true;
    subscription.options = PushSubscriptionOptions.getAsVapidSubscription(applicationServerKey);
    subscription.endpoint = PushSubscription.VAPID_SUBSCRIPTION.endpoint;
    return subscription;
  }

  public static getAsFcmSubscription(pushManager: PushManager, applicationServerKey: number) {
    const subscription = new PushSubscription(pushManager);
    subscription.isVapid = false;
    subscription.options = PushSubscriptionOptions.getAsFcmSubscription(applicationServerKey);
    subscription.endpoint = PushSubscription.FCM_SUBSCRIPTION.endpoint;
    return subscription;
  }

  getKey(param): ArrayBuffer | SharedArrayBuffer {
    const p256dh = this.isVapid ? PushSubscription.VAPID_SUBSCRIPTION.p256dh : PushSubscription.FCM_SUBSCRIPTION.p256dh;
    const auth = this.isVapid ? PushSubscription.VAPID_SUBSCRIPTION.auth : PushSubscription.FCM_SUBSCRIPTION.auth;

    switch (param) {
      case 'p256dh':
        return base64ToUint8Array(p256dh).buffer;
      case 'auth':
        return base64ToUint8Array(auth).buffer;
      default:
        return null;
    }
  }

  toJSON() {
    return {
      endpoint: this.endpoint,
      options: this.options
    };
  }

  async unsubscribe() {
    this.pushManager.subscription = null;
    return true;
  }
}
