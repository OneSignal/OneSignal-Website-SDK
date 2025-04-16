import { IDManager } from 'src/shared/managers/IDManager';
import { OPERATION_NAME } from '../executors/constants';
import { BaseSubscriptionOperation } from './BaseSubscriptionOperation';
import { GroupComparisonType, GroupComparisonValue } from './Operation';

/**
 * An Operation to delete a subscription from the OneSignal backend.
 */
export class DeleteSubscriptionOperation extends BaseSubscriptionOperation {
  constructor(appId?: string, onesignalId?: string, subscriptionId?: string) {
    super(
      OPERATION_NAME.DELETE_SUBSCRIPTION,
      appId,
      onesignalId,
      subscriptionId,
    );
  }

  override get groupComparisonType(): GroupComparisonValue {
    return GroupComparisonType.NONE;
  }

  override get canStartExecute(): boolean {
    return (
      !IDManager.isLocalId(this.onesignalId) &&
      !IDManager.isLocalId(this.subscriptionId)
    );
  }
}
