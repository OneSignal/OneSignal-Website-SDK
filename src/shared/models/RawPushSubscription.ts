import { Serializable } from '../../page/models/Serializable';

export class RawPushSubscription implements Serializable {
  /**
   * The GCM/FCM registration token, along with the full URL.i.
   */
  w3cEndpoint: URL | undefined;
  w3cP256dh: string | undefined;
  w3cAuth: string | undefined;
  /**
   * Given a native W3C browser push subscription, takes the endpoint, p256dh,
   * and auth.
   *
   * @param pushSubscription A native browser W3C push subscription.
   */
  public static setFromW3cSubscription(
    pushSubscription: PushSubscription,
  ): RawPushSubscription {
    const rawPushSubscription = new RawPushSubscription();

    if (pushSubscription) {
      rawPushSubscription.w3cEndpoint = new URL(pushSubscription.endpoint);

      // Retrieve p256dh and auth for encrypted web push protocol
      if (pushSubscription.getKey) {
        // p256dh and auth are both ArrayBuffer
        let p256dh = null;
        try {
          p256dh = pushSubscription.getKey('p256dh');
        } catch (e) {
          // User is most likely running < Chrome < 50
        }
        let auth: ArrayBuffer | null = null;
        try {
          auth = pushSubscription.getKey('auth');
        } catch (e) {
          // User is most likely running < Firefox 45
        }

        if (p256dh) {
          // Base64 encode the ArrayBuffer (not URL-Safe, using standard Base64)
          const p256dh_base64encoded = btoa(
            String.fromCharCode.apply(null, new Uint8Array(p256dh)),
          );
          rawPushSubscription.w3cP256dh = p256dh_base64encoded;
        }
        if (auth) {
          // Base64 encode the ArrayBuffer (not URL-Safe, using standard Base64)
          const auth_base64encoded = btoa(
            String.fromCharCode.apply(null, new Uint8Array(auth)),
          );
          rawPushSubscription.w3cAuth = auth_base64encoded;
        }
      }
    }

    return rawPushSubscription;
  }

  public serialize() {
    const serializedBundle = {
      /* Old Parameters */
      w3cEndpoint: this.w3cEndpoint?.toString(),
      w3cP256dh: this.w3cP256dh,
      w3cAuth: this.w3cAuth,
    };

    return serializedBundle;
  }

  public static deserialize(bundle?: {
    w3cEndpoint: string;
    w3cP256dh: string;
    w3cAuth: string;
  }): RawPushSubscription {
    const subscription = new RawPushSubscription();
    if (!bundle) {
      return subscription;
    }
    subscription.w3cEndpoint = new URL(bundle.w3cEndpoint);
    subscription.w3cP256dh = bundle.w3cP256dh;
    subscription.w3cAuth = bundle.w3cAuth;
    return subscription;
  }
}
