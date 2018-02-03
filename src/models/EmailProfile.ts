import {Uuid} from "./Uuid";
import { Serializable } from './Serializable';


export class EmailProfile implements Serializable {
  /**
   * The OneSignal email player ID obtained after creating an email device record with the plain
   * text email address.
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
    const bundle: any = {
      emailAddress: this.emailAddress,
      emailAuthHash: this.emailAuthHash
    }

    if (this.emailId) {
      bundle.emailId = this.emailId.serialize();
    }

    return bundle;
  }

  static deserialize(bundle: any): EmailProfile {
    const emailProfile = new EmailProfile();
    emailProfile.emailId = Uuid.deserialize(bundle.emailId);
    emailProfile.emailAddress = bundle.emailAddress;
    emailProfile.emailAuthHash = bundle.emailAuthHash;
    return emailProfile;
  }
}
