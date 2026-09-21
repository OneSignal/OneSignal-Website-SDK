import { OPERATION_NAME } from '../constants';
import { BaseSubscriptionOperation, type SubscriptionOpts } from './BaseSubscriptionOperation';
import { GroupComparisonType, type GroupComparisonValue } from './Operation';

/**
 * An Operation to transfer a subscription to a new owner on the OneSignal backend.
 */
export class TransferSubscriptionOperation extends BaseSubscriptionOperation {
  constructor(opts?: SubscriptionOpts) {
    super(OPERATION_NAME._TransferSubscription, opts);
  }

  override get _groupComparisonType(): GroupComparisonValue {
    return GroupComparisonType._None;
  }

  override get _modifyComparisonKey(): string {
    return `${this._appId}.Subscription.${this._subscriptionId}.Transfer`;
  }
}
