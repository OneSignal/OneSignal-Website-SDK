import { SecondaryChannelProfileSerializable } from '../../page/models/SecondaryChannelProfile';

export interface BundleSMS {
  smsId?: string;
  smsNumber: string;
  identifierAuthHash: string;
}

export class SMSProfile
  implements SecondaryChannelProfileSerializable<BundleSMS>
{
  subscriptionId: string | null | undefined;
  identifier: string | null | undefined;
  identifierAuthHash: string | null | undefined;

  constructor(
    smsId?: string | null,
    smsNumber?: string,
    identifierAuthHash?: string,
  ) {
    this.subscriptionId = smsId;
    this.identifier = smsNumber;
    this.identifierAuthHash = identifierAuthHash;
  }

  serialize(): BundleSMS {
    return {
      identifierAuthHash: this.identifierAuthHash,
      smsNumber: this.identifier,
      smsId: this.subscriptionId,
    } as BundleSMS;
  }

  static deserialize(bundle: BundleSMS): SMSProfile {
    return new SMSProfile(
      bundle.smsId,
      bundle.smsNumber,
      bundle.identifierAuthHash,
    );
  }
}
