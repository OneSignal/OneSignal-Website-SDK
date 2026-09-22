import { OPERATION_NAME } from '../constants';
import { GroupComparisonType, type GroupComparisonValue, Operation } from './Operation';

/**
 * An Operation to retrieve a user from the OneSignal backend. The resulting user
 * will replace the current user.
 */
export class RefreshUserOperation extends Operation {
  constructor();
  constructor(appId: string, onesignalId: string, externalId?: string);
  constructor(appId?: string, onesignalId?: string, externalId?: string) {
    super(OPERATION_NAME._RefreshUser, appId, onesignalId, externalId);
  }

  override get _createComparisonKey(): string {
    return `${this._appId}.User.${this._onesignalId}.Refresh`;
  }

  override get _modifyComparisonKey(): string {
    return `${this._appId}.User.${this._onesignalId}.Refresh`;
  }

  override get _groupComparisonType(): GroupComparisonValue {
    return GroupComparisonType._Create;
  }
}
