import bowser from 'bowser';

import NotImplementedError from '../errors/NotImplementedError';
import { RawPushSubscription } from './RawPushSubscription';
import { SubscriptionStateKind } from './SubscriptionStateKind';
import { DeviceRecord, FlattenedDeviceRecord } from './DeviceRecord';

export interface SerializedPushDeviceRecord extends FlattenedDeviceRecord {
  identifier?: string | null;
  web_auth?: string;
  web_p256?: string;
}

/**
 * Describes a push notification device record.
 */
export class PushDeviceRecord extends DeviceRecord {
  public subscription: RawPushSubscription | undefined;

  /**
   * @param subscription Omitting this parameter does not void the record's identifier.
   */
  constructor(subscription?: RawPushSubscription) {
    super();
    this.subscription = subscription;
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
    const pushRegistration = new PushDeviceRecord(rawPushSubscription);
    pushRegistration.appId = appId;
    pushRegistration.subscriptionState = rawPushSubscription ?
      SubscriptionStateKind.Subscribed :
      SubscriptionStateKind.NotSubscribed;
    if (subscriptionState) {
      pushRegistration.subscriptionState = subscriptionState;
    }
    return pushRegistration;
  }

  deserialize(_: object): PushDeviceRecord { throw new NotImplementedError(); }
}
