import { SecondaryChannelProfileSerializable } from './SecondaryChannelProfile';

export interface BundleTypeEmail {
  emailId?: string;
  emailAddress: string;
  identifierAuthHash: string;
}

export class EmailProfile implements SecondaryChannelProfileSerializable<BundleTypeEmail> {

  playerId: string | null | undefined;
  identifier: string | null | undefined;
  identifierAuthHash: string | null | undefined;

  constructor(emailId?: string | null, emailAddress?: string, identifierAuthHash?: string) {
    this.playerId = emailId;
    this.identifier = emailAddress;
    this.identifierAuthHash = identifierAuthHash;
  }

  serialize(): BundleTypeEmail {
    return {
      identifierAuthHash: this.identifierAuthHash,
      emailAddress: this.identifier,
      emailId: this.playerId,
    } as BundleTypeEmail;
  }

  static deserialize(bundle: BundleTypeEmail): EmailProfile {
    return new EmailProfile(
      bundle.emailId,
      bundle.emailAddress,
      bundle.identifierAuthHash,
    );
  }
}
