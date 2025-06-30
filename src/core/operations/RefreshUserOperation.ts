import { OPERATION_NAME } from '../constants';

import {
  GroupComparisonType,
  GroupComparisonValue,
  Operation,
} from './Operation';

/**
 * An Operation to retrieve a user from the OneSignal backend. The resulting user
 * will replace the current user.
 */
export class RefreshUserOperation extends Operation {
  constructor();
  constructor(appId: string, onesignalId: string);
  constructor(appId?: string, onesignalId?: string) {
    super(OPERATION_NAME.REFRESH_USER, appId, onesignalId);
  }

  override get createComparisonKey(): string {
    return `${this.appId}.User.${this.onesignalId}.Refresh`;
  }

  override get modifyComparisonKey(): string {
    return `${this.appId}.User.${this.onesignalId}.Refresh`;
  }

  override get groupComparisonType(): GroupComparisonValue {
    return GroupComparisonType.CREATE;
  }
}
