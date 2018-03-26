import {Uuid} from "./Uuid";
import { Serializable } from './Serializable';


export class Subscription implements Serializable {
  /**
   * The OneSignal player ID.
   */
  deviceId: Uuid;
  /**
   * The GCM/FCM registration token, as a stringified URL, or the Safari device token.
   */
  subscriptionToken: string;
  /**
   * Whether the user is opted out of notifications, set by setSubscription().
   */
  optedOut: boolean;
  /**
   * A UTC timestamp of when this subscription was created. This value is not modified when a
   * subscription is merely refreshed, only when a subscription is created anew.
   */
  createdAt: number;
  /**
   * For HTTP sites only. This property is stored on the native PushSubscription object, but it's inaccessible
   * in cross-origin frames.
   */
  expirationTime: number;

  serialize() {
    return {
      deviceId: this.deviceId.serialize(),
      subscriptionToken: this.subscriptionToken,
      optedOut: this.optedOut,
      createdAt: this.createdAt,
      expirationTime: this.expirationTime,
    }
  }

  static deserialize(bundle: any): Subscription {
    const subscription = new Subscription();
    subscription.deviceId = Uuid.deserialize(bundle.deviceId);
    subscription.subscriptionToken = bundle.subscriptionToken;
    subscription.optedOut = bundle.optedOut;
    subscription.createdAt = bundle.createdAt;
    subscription.expirationTime = bundle.expirationTime;
    return subscription;
  }
}
