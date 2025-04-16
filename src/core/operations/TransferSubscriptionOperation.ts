import { OPERATION_NAME } from '../executors/constants';
import { BaseSubscriptionOperation } from './BaseSubscriptionOperation';
import { GroupComparisonType, GroupComparisonValue } from './Operation';

/**
 * An Operation to transfer a subscription to a new owner on the OneSignal backend.
 */
export class TransferSubscriptionOperation extends BaseSubscriptionOperation {
  constructor(appId?: string, onesignalId?: string, subscriptionId?: string) {
    super(OPERATION_NAME.TRANSFER_SUBSCRIPTION, appId, onesignalId);
    if (subscriptionId) {
      this.subscriptionId = subscriptionId;
    }
  }

  override get groupComparisonType(): GroupComparisonValue {
    return GroupComparisonType.NONE;
  }

  override get modifyComparisonKey(): string {
    return `${this.appId}.Subscription.${this.subscriptionId}.Transfer`;
  }
}
