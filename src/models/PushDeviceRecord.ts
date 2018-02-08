import * as Browser from 'bowser';

import Environment from '../Environment';
import NotImplementedError from '../errors/NotImplementedError';
import { DeliveryPlatformKind } from './DeliveryPlatformKind';
import { DevicePlatformKind } from './DevicePlatformKind';
import { RawPushSubscription } from './RawPushSubscription';
import { Serializable } from './Serializable';
import { SubscriptionStateKind } from './SubscriptionStateKind';
import { Uuid } from './Uuid';
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
      serializedBundle.identifier = Browser.safari ?
        this.subscription.safariDeviceToken :
        this.subscription.w3cEndpoint.toString();
      serializedBundle.web_auth = this.subscription.w3cAuth;
      serializedBundle.web_p256 = this.subscription.w3cP256dh;
    }

    return serializedBundle;
  }

  deserialize(_: object): PushDeviceRecord { throw new NotImplementedError(); }
}
