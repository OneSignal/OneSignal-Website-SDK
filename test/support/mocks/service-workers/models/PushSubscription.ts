import PushSubscriptionOptions from './PushSubscriptionOptions';
import PushManager from './PushManager';
import { base64ToUint8Array } from '../../../../../src/utils/Encoding';
import Random from "../../../tester/Random";

/**
 * The PushSubscription interface of the Push API provides a subcription's URL endpoint and allows
 * unsubscription from a push service.
 */
export default class PushSubscription {
  /**
   * The endpoint associated with the push subscription.
   */
  public endpoint: string;

  /**
   * An object containing containing the options used to create the subscription.
   *
   * If a GCM sender ID or VAPID applicationServerKey was used to subscribe, it will be present as
   * `options.applicationServerKey`.
   */
  public options: PushSubscriptionOptions;

  /**
   * A DOMHighResTimeStamp of the subscription expiration time associated with the push
   * subscription, if there is one, or null otherwise.
   */
  public expirationTime?: number;

  private pushManager: PushManager;
  private p256dhArray: Uint8Array;
  private authArray: Uint8Array;
  private readonly ENDPOINT_LENGTH = 152;
  private readonly ENDPOINT_CHARSET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_:';
  private readonly P256DH_BYTE_LENGTH = 65;
  private readonly AUTH_BYTE_LENGTH = 16;

  /**
   * For internal use only. Generates random data for p256dh, auth, and endpoint on construction.
   *
   * @param pushManager: A reference to the PushManager is needed to set the subscription property
   * to null when unsubscribe() is called on this instance.
   *
   * @param options: Options passed to PushManager.subscribe().
   */
  constructor(pushManager: PushManager, options: PushSubscriptionOptions) {
    this.pushManager = pushManager;
    this.options = options;

    if (!options.applicationServerKey) {
      throw new Error("An applicationServerKey must be passed. If you're subscribing via GCM sender ID, " +
        "that can be the applicationServerKey encoded as an ArrayBuffer.");
    }

    // Keep the options constant; this is what the user passed in to subscribe
    if (options.applicationServerKey.byteLength >= 65) {
      // We are subscribing via VAPID
      const suffix = Random.getRandomString(this.ENDPOINT_LENGTH, this.ENDPOINT_CHARSET);
      this.endpoint = `https://fcm.googleapis.com/fcm/send/${suffix}`;
    } else {
      // We are subscribing via legacy GCM sender ID
      const suffix = Random.getRandomString(this.ENDPOINT_LENGTH, this.ENDPOINT_CHARSET);
      this.endpoint = `https://android.googleapis.com/gcm/send/${suffix}`;
    }

    this.p256dhArray = Random.getRandomUint8Array(this.P256DH_BYTE_LENGTH);
    this.authArray = Random.getRandomUint8Array(this.AUTH_BYTE_LENGTH);
  }

  /**
   * Returns an ArrayBuffer which contains the client's public key, which can then be sent to a
   * server and used in encrypting push message data.
   */
  getKey(param): ArrayBufferLike {
    switch (param) {
      case 'p256dh':
        return this.p256dhArray.buffer;
      case 'auth':
        return this.authArray.buffer;
      default:
        return null;
    }
  }

  /**
   * The toJSON() method of the PushSubscription interface is a standard serializer: it returns a
   * JSON representation of the subscription properties, providing a useful shortcut.
   */
  toJSON() {
    return {
      endpoint: this.endpoint,
      options: this.options
    };
  }

  /**
   * Starts the asynchronous process of unsubscribing from the push service, returning a Promise
   * that resolves to a Boolean when the current subscription is successfully unregistered.
   */
  async unsubscribe(): Promise<boolean> {
    this.pushManager.__unsubscribe();
    return true;
  }
}
