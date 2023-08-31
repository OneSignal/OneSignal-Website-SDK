import { SecondaryChannelProfileSerializable } from '../../page/models/SecondaryChannelProfile';

export interface BundleEmail {
  emailId?: string;
  emailAddress: string;
  identifierAuthHash: string;
}

export class EmailProfile
  implements SecondaryChannelProfileSerializable<BundleEmail>
{
  subscriptionId: string | null | undefined;
  identifier: string | null | undefined;
  identifierAuthHash: string | null | undefined;

  constructor(
    emailId?: string | null,
    emailAddress?: string,
    identifierAuthHash?: string,
  ) {
    this.subscriptionId = emailId;
    this.identifier = emailAddress;
    this.identifierAuthHash = identifierAuthHash;
  }

  serialize(): BundleEmail {
    return {
      identifierAuthHash: this.identifierAuthHash,
      emailAddress: this.identifier,
      emailId: this.subscriptionId,
    } as BundleEmail;
  }

  static deserialize(bundle: BundleEmail): EmailProfile {
    return new EmailProfile(
      bundle.emailId,
      bundle.emailAddress,
      bundle.identifierAuthHash,
    );
  }
}
