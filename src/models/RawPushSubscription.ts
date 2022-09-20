import { Serializable } from './Serializable';

export class RawPushSubscription implements Serializable {
  /**
     * The GCM/FCM registration token, along with the full URL. Not used for Safari.
     */
  w3cEndpoint: URL | undefined;
  w3cP256dh: string | undefined;
  w3cAuth: string | undefined;
  /**
     * A Safari-only push subscription device token. Not used for Chrome/Firefox.
     */
  safariDeviceToken: string | undefined;
  /**
   * A full RawPushSubscription object of the existing W3C subscription, if any.
   *
   * This is used to determine whether the subscription changed, so we know
   * whether to contact OneSignal to update the subscription.
   */
  existingW3cPushSubscription: RawPushSubscription | undefined;
  /**
   * The existing Safari subscription device token, if it exists.
   *
   * This is used to determine whether the subscription changed, so we know
   * whether to contact OneSignal to update the subscription.
   */
  existingSafariDeviceToken: string | undefined | null;

  /**
   * Returns true if an existing recorded W3C or Safari subscription is
   * identical to the current subscription.
   */
  public isNewSubscription(): boolean {
    if (this.existingW3cPushSubscription) {
      if (!!this.existingW3cPushSubscription.w3cEndpoint !== !!this.w3cEndpoint) {
        return true;
      }
      if (!!this.existingW3cPushSubscription.w3cEndpoint && !!this.w3cEndpoint && 
        this.existingW3cPushSubscription.w3cEndpoint.toString() !== this.w3cEndpoint.toString()) {
          return true;
      }
      if (this.existingW3cPushSubscription.w3cP256dh !== this.w3cP256dh) {
        return true;
      }
      if (this.existingW3cPushSubscription.w3cAuth !== this.w3cAuth) {
        return true;
      }
      return false;
    } else if (this.existingSafariDeviceToken) {
      return this.existingSafariDeviceToken !== this.safariDeviceToken;
    }
    return true;
  }

  /**
   * Given a native W3C browser push subscription, takes the endpoint, p256dh,
   * and auth.
   *
   * @param pushSubscription A native browser W3C push subscription.
   */
  public static setFromW3cSubscription(pushSubscription: PushSubscription): RawPushSubscription {
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
        let auth = null;
        try {
          auth = pushSubscription.getKey('auth');
        } catch (e) {
          // User is most likely running < Firefox 45
        }

        if (p256dh) {
          // Base64 encode the ArrayBuffer (not URL-Safe, using standard Base64)
          const p256dh_base64encoded = btoa(String.fromCharCode.apply(null, new Uint8Array(p256dh)));
          rawPushSubscription.w3cP256dh = p256dh_base64encoded;
        }
        if (auth) {
          // Base64 encode the ArrayBuffer (not URL-Safe, using standard Base64)
          const auth_base64encoded = btoa(String.fromCharCode.apply(null, new Uint8Array(auth)));
          rawPushSubscription.w3cAuth = auth_base64encoded;
        }
      }
    }

    return rawPushSubscription;
  }

  /**
   * Given a native browser Safari push subscription, sets the device token
   * property.
   *
   * @param safariDeviceToken A native browser Safari push subscription.
   */
  public setFromSafariSubscription(safariDeviceToken: string) {
    this.safariDeviceToken = safariDeviceToken;
  }

  public serialize() {
    const serializedBundle: any = {
      /* Old Parameters */
      w3cEndpoint: this.w3cEndpoint ? this.w3cEndpoint.toString() : null,
      w3cP256dh: this.w3cP256dh,
      w3cAuth: this.w3cAuth,
      safariDeviceToken: this.safariDeviceToken,
      existingPushSubscription: this.existingW3cPushSubscription ? this.existingW3cPushSubscription.serialize() : null,
      existingSafariDeviceToken: this.existingSafariDeviceToken
    };

    return serializedBundle;
  }

  // TODO: had a hard to debug bug here due to "any" type bypassing typescript validation.
  // Check the usage and maybe change with strict type
  public static deserialize(bundle: any): RawPushSubscription {
    const subscription = new RawPushSubscription();
    if (!bundle) {
      return subscription;
    }
    try {
      subscription.w3cEndpoint = new URL(bundle.w3cEndpoint);
    } catch (e) {
      // w3cEndpoint will be null for Safari
    }
    subscription.w3cP256dh = bundle.w3cP256dh;
    subscription.w3cAuth = bundle.w3cAuth;
    subscription.existingW3cPushSubscription = undefined;
    if (bundle.existingW3cPushSubscription) {
      subscription.existingW3cPushSubscription = RawPushSubscription.deserialize(bundle.existingW3cPushSubscription);
    } else if (bundle.existingPushSubscription) {
      subscription.existingW3cPushSubscription = RawPushSubscription.deserialize(bundle.existingPushSubscription);
    }
    subscription.safariDeviceToken = bundle.safariDeviceToken;
    subscription.existingSafariDeviceToken = bundle.existingSafariDeviceToken;
    return subscription;
  }
}
