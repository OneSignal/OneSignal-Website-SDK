import NotImplementedError from '../errors/NotImplementedError';
import { DeliveryPlatformKind } from './DeliveryPlatformKind';
import { DeviceRecord } from './DeviceRecord';

/**
 * Describes an secondary channel device record, such as an email.
 */
export class SecondaryChannelDeviceRecord extends DeviceRecord {
  /**
   * @param identifier Omitting this parameter does not void the record's identifier.
   */
  constructor(
    public identifier?: string | null,
    public identifierAuthHash?: string | null,
    public pushDeviceRecordId?: string | null,
  ) {
    super();
    this.deliveryPlatform = DeliveryPlatformKind.Email;
  }

  serialize() {
    const serializedBundle: any = super.serialize();

    if (this.identifier) {
      serializedBundle.identifier = this.identifier;
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
