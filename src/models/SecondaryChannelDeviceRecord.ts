import NotImplementedError from '../errors/NotImplementedError';
import { DeliveryPlatformKind } from './DeliveryPlatformKind';
import { DeviceRecord } from './DeviceRecord';

/**
 * Describes an email device record.
 */
export class SecondaryChannelDeviceRecord extends DeviceRecord {
  /**
   * @param email Omitting this parameter does not void the record's identifier.
   */
  constructor(
    public email?: string | null,
    public identifierAuthHash?: string | null,
    public pushDeviceRecordId?: string | null,
  ) {
    super();
    this.deliveryPlatform = DeliveryPlatformKind.Email;
  }

  serialize() {
    const serializedBundle: any = super.serialize();

    if (this.email) {
      serializedBundle.identifier = this.email;
    }
    if (this.identifierAuthHash) {
      serializedBundle.identifier_auth_hash = this.identifierAuthHash;
    }
    if (this.pushDeviceRecordId) {
      serializedBundle.device_player_id = this.pushDeviceRecordId;
    }

    return serializedBundle;
  }

  deserialize(_: object): SecondaryChannelDeviceRecord { throw new NotImplementedError(); }
}
