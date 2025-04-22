import { OPERATION_NAME } from '../constants';
import { BaseSubscriptionOperation } from './BaseSubscriptionOperation';
import { GroupComparisonType, GroupComparisonValue } from './Operation';

/**
 * An Operation to delete a subscription from the OneSignal backend.
 */
export class DeleteSubscriptionOperation extends BaseSubscriptionOperation {
  constructor();
  constructor(appId: string, onesignalId: string, subscriptionId: string);
  constructor(appId?: string, onesignalId?: string, subscriptionId?: string) {
    super(OPERATION_NAME.DELETE_SUBSCRIPTION, appId, onesignalId);
    if (subscriptionId) {
      this.subscriptionId = subscriptionId;
    }
  }

  override get groupComparisonType(): GroupComparisonValue {
    return GroupComparisonType.NONE;
  }
}
