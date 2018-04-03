
import { Serializable } from './Serializable';


export class EmailProfile implements Serializable {
  /**
   * The OneSignal email player ID obtained after creating an email device record with the plain
   * text email address.
   */
  emailId: string;
  /**
   * The plain text email address.
   */
  emailAddress: string;
  /**
   * The SHA-256 hash of the app's auth key and plain text email address in hex format.
   */
  emailAuthHash: string;

  serialize() {
    return {
      emailAddress: this.emailAddress,
      emailAuthHash: this.emailAuthHash,
      emailId: this.emailId,
    };
  }

  static deserialize(bundle: any): EmailProfile {
    const emailProfile = new EmailProfile();
    emailProfile.emailId = bundle.emailId;
    emailProfile.emailAddress = bundle.emailAddress;
    emailProfile.emailAuthHash = bundle.emailAuthHash;
    return emailProfile;
  }
}
