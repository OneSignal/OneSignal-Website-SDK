
import { Serializable } from './Serializable';


export class EmailProfile implements Serializable {
  /**
   * The OneSignal email player ID obtained after creating an email device record with the plain
   * text email address.
   */
  public emailId: string | null | undefined;
  /**
   * The plain text email address.
   */
  public emailAddress: string | null | undefined;
  /**
   * The SHA-256 hash of the app's auth key and plain text email address in hex format.
   */
  public emailAuthHash: string | null | undefined;

  constructor(emailId?: string | null, emailAddress?: string, identifierAuthHash?: string) {
    this.emailId = emailId;
    this.emailAddress = emailAddress;
    this.emailAuthHash = emailAuthHash;
  }

  serialize() {
    return {
      emailAuthHash: this.emailAuthHash,
      emailAddress: this.emailAddress,
      emailId: this.emailId,
    };
  }

  static deserialize(bundle: any): EmailProfile {
    return new EmailProfile(
      bundle.emailId,
      bundle.emailAddress,
      bundle.emailAuthHash,
    );
  }
}
