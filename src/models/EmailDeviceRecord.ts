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
 * Describes an email device record.
 */
export class EmailDeviceRecord extends DeviceRecord {

  /**
   * @param email Omitting this parameter does not void the record's identifier.
   */
  constructor(
    public email: string,
    public emailAuthHash: string
  ) {
    super();
  }

  serialize() {
    const serializedBundle: any = super.serialize();

    if (this.email) {
      serializedBundle.identifier = this.email;
    }
    if (this.emailAuthHash) {
      serializedBundle.email_auth_hash = this.emailAuthHash;
    }

    return serializedBundle;
  }

  deserialize(_: object): EmailDeviceRecord { throw new NotImplementedError(); }
}
