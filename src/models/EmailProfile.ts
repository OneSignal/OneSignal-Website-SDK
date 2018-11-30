
import { Serializable } from './Serializable';


export class EmailProfile implements Serializable {
  /**
   * The OneSignal email player ID obtained after creating an email device record with the plain
   * text email address.
   */
  public emailId: string | undefined;
  /**
   * The plain text email address.
   */
  public emailAddress: string | undefined;
  /**
   * The SHA-256 hash of the app's auth key and plain text email address in hex format.
   */
  public emailAuthHash: string | undefined;

  constructor(emailId?: string, emailAddress?: string, emailAuthHash?: string) {
    this.emailId = emailId;
    this.emailAddress = emailAddress;
    this.emailAuthHash = emailAuthHash;
  }

  serialize() {
    return {
      emailAddress: this.emailAddress,
      emailAuthHash: this.emailAuthHash,
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
