import type { IdentitySchema } from 'src/shared/database/types';
import { IdentityConstants } from '../constants';
import { Model } from './Model';

/**
 * The identity model as a MapModel: a simple key-value pair where the key represents
 * the alias label and the value represents the alias ID for that alias label.
 * This model provides simple access to more well-defined aliases.
 */
export class IdentityModel extends Model<IdentitySchema> {
  /**
   * The OneSignal ID for this identity.
   * WARNING: This *might* be a local ID depending on whether the user has been
   * successfully created on the backend or not.
   */
  get _onesignalId(): string {
    return this._getProperty(IdentityConstants.ONESIGNAL_ID);
  }

  set _onesignalId(value: string) {
    this._setProperty(IdentityConstants.ONESIGNAL_ID, value);
  }

  /**
   * The (developer-managed) identifier that uniquely identifies this user.
   */
  get _externalId(): string | undefined {
    return this._getProperty(IdentityConstants.EXTERNAL_ID);
  }

  set _externalId(value: string | undefined) {
    this._setProperty(IdentityConstants.EXTERNAL_ID, value);
  }
}
