import { OPERATION_NAME } from '../constants';
import { BaseSubscriptionOperation } from './BaseSubscriptionOperation';
import { GroupComparisonType, type GroupComparisonValue } from './Operation';

/**
 * An Operation to transfer a subscription to a new owner on the OneSignal backend.
 */
export class TransferSubscriptionOperation extends BaseSubscriptionOperation {
  constructor();
  constructor(appId: string, onesignalId: string, subscriptionId: string);
  constructor(appId?: string, onesignalId?: string, subscriptionId?: string) {
    super(OPERATION_NAME.TRANSFER_SUBSCRIPTION, appId, onesignalId);
    if (subscriptionId) this.subscriptionId = subscriptionId;
  }

  override get _groupComparisonType(): GroupComparisonValue {
    return GroupComparisonType.NONE;
  }

  override get _modifyComparisonKey(): string {
    return `${this._appId}.Subscription.${this.subscriptionId}.Transfer`;
  }
}
