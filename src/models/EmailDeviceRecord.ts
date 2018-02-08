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
 * Describes an email device record.
 */
export class EmailDeviceRecord extends DeviceRecord {
  public email: string;

  /**
   * @param email Omitting this parameter does not void the record's identifier.
   */
  constructor(email: string) {
    super();
    this.email = email;
  }

  serialize() {
    const serializedBundle: any = super.serialize();

    if (this.email) {
      serializedBundle.identifier = this.email;
    }

    return serializedBundle;
  }

  deserialize(_: object): EmailDeviceRecord { throw new NotImplementedError(); }
}
