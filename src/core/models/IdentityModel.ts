import { IdentityConstants } from '../constants';
import { Model } from './Model';

type IIdentityModel = {
  [IdentityConstants.ONESIGNAL_ID]: string;
  [IdentityConstants.EXTERNAL_ID]?: string | undefined;
  [key: string]: string | undefined;
};

/**
 * The identity model as a MapModel: a simple key-value pair where the key represents
 * the alias label and the value represents the alias ID for that alias label.
 * This model provides simple access to more well-defined aliases.
 */
export class IdentityModel extends Model<IIdentityModel> {
  /**
   * The OneSignal ID for this identity.
   * WARNING: This *might* be a local ID depending on whether the user has been
   * successfully created on the backend or not.
   */
  get onesignalId(): string {
    return this.getProperty(IdentityConstants.ONESIGNAL_ID);
  }

  set onesignalId(value: string) {
    this.setProperty(IdentityConstants.ONESIGNAL_ID, value);
  }

  /**
   * The (developer-managed) identifier that uniquely identifies this user.
   */
  get externalId(): string | undefined {
    return this.getProperty(IdentityConstants.EXTERNAL_ID);
  }

  set externalId(value: string | undefined) {
    this.setProperty(IdentityConstants.EXTERNAL_ID, value);
  }
}
