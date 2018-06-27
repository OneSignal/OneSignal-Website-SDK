import bowser from 'bowser';

import Environment from '../Environment';
import NotImplementedError from '../errors/NotImplementedError';
import { DeliveryPlatformKind } from './DeliveryPlatformKind';
import { DevicePlatformKind } from './DevicePlatformKind';
import { RawPushSubscription } from './RawPushSubscription';
import { Serializable } from './Serializable';
import { SubscriptionStateKind } from './SubscriptionStateKind';

import { DeviceRecord } from './DeviceRecord';


/**
 * Describes a push notification device record.
 */
export class PushDeviceRecord extends DeviceRecord {
  public subscription: RawPushSubscription;

  /**
   * @param subscription Omitting this parameter does not void the record's identifier.
   */
  constructor(subscription: RawPushSubscription) {
    super();
    this.subscription = subscription;
  }

  serialize() {
    const serializedBundle: any = super.serialize();

    if (this.subscription) {
      serializedBundle.identifier = bowser.safari ?
        this.subscription.safariDeviceToken :
        this.subscription.w3cEndpoint ? this.subscription.w3cEndpoint.toString() : null;
      serializedBundle.web_auth = this.subscription.w3cAuth;
      serializedBundle.web_p256 = this.subscription.w3cP256dh;
    }

    return serializedBundle;
  }

  static createFromPushSubscription(
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
