import Random from "../../../tester/Random";
import { MockPushManager } from "./MockPushManager";

/**
 * The PushSubscription interface of the Push API provides a subcription's URL endpoint and allows
 * unsubscription from a push service.
 */
export class MockPushSubscription implements PushSubscription {
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
  // Defined as a getter so simon.stub can override
  get expirationTime(): number | null {
    return null;
  }

  private pushManager: MockPushManager;
  private p256dhArray: Uint8Array;
  private authArray: Uint8Array;
  private readonly ENDPOINT_LENGTH = 152;
  private readonly ENDPOINT_CHARSET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_:';
  private readonly P256DH_BYTE_LENGTH = 65;
  private readonly AUTH_BYTE_LENGTH = 16;

  private static str2ab(str: any): ArrayBuffer {
    const buf = new ArrayBuffer(str.length * 2); // 2 bytes for each char
    const bufView = new Uint16Array(buf);
    for(let i = 0, strLen=str.length; i < strLen; i++) {
      bufView[i] = str.charCodeAt(i);
    }
    return buf;
  }

  /**
   * For internal use only. Generates random data for p256dh, auth, and endpoint on construction.
   *
   * @param pushManager: A reference to the PushManager is needed to set the subscription property
   * to null when unsubscribe() is called on this instance.
   *
   * @param options: Options passed to PushManager.subscribe().
   */
  constructor(pushManager: MockPushManager, options: PushSubscriptionOptionsInit) {
    this.pushManager = pushManager;

    let applicationServerKey: ArrayBuffer | null;
    if (options.applicationServerKey instanceof ArrayBuffer)
      applicationServerKey = options.applicationServerKey;
    else if (options.applicationServerKey instanceof String)
      applicationServerKey = MockPushSubscription.str2ab(options.applicationServerKey);
    else
      throw new Error("Mock not implemented type options.applicationServerKey");

    this.options = {
      applicationServerKey: applicationServerKey,
      userVisibleOnly: options.userVisibleOnly || true
    };

    if (!options.applicationServerKey) {
      throw new Error("An applicationServerKey must be passed. If you're subscribing via GCM sender ID, " +
        "that can be the applicationServerKey encoded as an ArrayBuffer.");
    }

    // Keep the options constant; this is what the user passed in to subscribe
    if (this.options.applicationServerKey && this.options.applicationServerKey.byteLength >= 65) {
      // We are subscribing via VAPID
      const suffix = Random.getRandomString(this.ENDPOINT_LENGTH, this.ENDPOINT_CHARSET);
      this.endpoint = `https://fcm.googleapis.com/fcm/send/${suffix}`;
    } else {
      // TODO: Remove this legacy mock
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
  getKey(param: string): ArrayBuffer | null {
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
  toJSON(): any {
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
