import { SecondaryChannelProfileSerializable } from './SecondaryChannelProfile';

export interface BundleTypeEmail {
  emailId?: string;
  emailAddress: string;
  identifierAuthHash: string;
}

export class EmailProfile extends SecondaryChannelProfileSerializable<BundleTypeEmail> {

  constructor(emailId?: string | null, emailAddress?: string, identifierAuthHash?: string) {
    super();
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
