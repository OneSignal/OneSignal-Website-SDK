import NotImplementedError from "src/errors/NotImplementedError";
import { DeliveryPlatformKind } from "src/models/DeliveryPlatformKind";
import { AbstractSubscription } from "./AbstractSubscription";

export class EmailSubscription extends AbstractSubscription {
  /**
   * @param email Omitting this parameter does not void the record's identifier.
   */
  constructor(
    public email?: string | null,
    public identifierAuthHash?: string | null,
    public pushDeviceRecordId?: string | null,
  ) {
    super();
  }

  protected getDeliveryPlatform(): DeliveryPlatformKind {
    return DeliveryPlatformKind.Email;
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

  deserialize(_: object): EmailSubscription { throw new NotImplementedError(); }
}
