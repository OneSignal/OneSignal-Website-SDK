import bowser from 'bowser';

import { DeliveryPlatformKind } from 'src/models/DeliveryPlatformKind';
import { RawPushSubscription } from 'src/models/RawPushSubscription';
import { SubscriptionStateKind } from 'src/models/SubscriptionStateKind';
import OneSignalUtils from 'src/utils/OneSignalUtils';
import { AbstractSubscription, FlattenedDeviceRecord } from './AbstractSubscription';

export interface SerializedPushDeviceRecord extends FlattenedDeviceRecord {
  identifier?: string | null;
  web_auth?: string;
  web_p256?: string;
}

/**
 * Describes a push notification device record.
 */
export class PushSubscription extends AbstractSubscription {
  public subscription: RawPushSubscription | undefined;

  /**
   * @param subscription Omitting this parameter does not void the record's identifier.
   */
  constructor(subscription?: RawPushSubscription) {
    super();
    this.subscription = subscription;
  }

  isSafari(): boolean {
    return bowser.safari && window.safari !== undefined && window.safari.pushNotification !== undefined;
  }

  getDeliveryPlatform(): DeliveryPlatformKind {
    // For testing purposes, allows changing the browser user agent
    const browser = OneSignalUtils.redetectBrowserUserAgent();

    if (this.isSafari()) {
      return DeliveryPlatformKind.Safari;
    } else if (browser.firefox) {
      return DeliveryPlatformKind.Firefox;
    } else if (browser.msedge) {
      return DeliveryPlatformKind.Edge;
    } else {
      return DeliveryPlatformKind.ChromeLike;
    }
  }

  serialize(): SerializedPushDeviceRecord {
    const serializedBundle: SerializedPushDeviceRecord = super.serialize();

    if (this.subscription) {
      serializedBundle.identifier = bowser.safari ?
        this.subscription.safariDeviceToken :
        this.subscription.w3cEndpoint ? this.subscription.w3cEndpoint.toString() : null;
      serializedBundle.web_auth = this.subscription.w3cAuth;
      serializedBundle.web_p256 = this.subscription.w3cP256dh;
    }

    return serializedBundle;
  }

  public static createFromPushSubscription(
    appId: string,
    rawPushSubscription: RawPushSubscription,
    subscriptionState?: SubscriptionStateKind,
  ) {
    const pushRegistration = new PushSubscription(rawPushSubscription);
    pushRegistration.appId = appId;
    pushRegistration.subscriptionState = rawPushSubscription ?
      SubscriptionStateKind.Subscribed :
      SubscriptionStateKind.NotSubscribed;
    if (subscriptionState) {
      pushRegistration.subscriptionState = subscriptionState;
    }
    return pushRegistration;
  }

  deserialize(_: object): PushSubscription { throw new NotImplementedError(); }
}
