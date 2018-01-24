import {Uuid} from "./Uuid";
import { Serializable } from './Serializable';


export class EmailProfile implements Serializable {
  /**
   * The OneSignal email player ID.
   */
  emailId: Uuid;
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
      emailId: this.emailId.serialize(),
      emailAddress: this.emailAddress,
      emailAuthHash: this.emailAuthHash
    }
  }

  static deserialize(bundle: any): EmailProfile {
    const emailProfile = new EmailProfile();
    emailProfile.emailId = Uuid.deserialize(bundle.emailId);
    emailProfile.emailAddress = bundle.emailAddress;
    emailProfile.emailAuthHash = bundle.emailAuthHash;
    return emailProfile;
  }
}
