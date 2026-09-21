import { OPERATION_NAME } from '../constants';
import { BaseSubscriptionOperation, type SubscriptionOpts } from './BaseSubscriptionOperation';
import { GroupComparisonType, type GroupComparisonValue } from './Operation';

/**
 * An Operation to delete a subscription from the OneSignal backend.
 */
export class DeleteSubscriptionOperation extends BaseSubscriptionOperation {
  constructor(opts?: SubscriptionOpts) {
    super(OPERATION_NAME._DeleteSubscription, opts);
  }

  override get _groupComparisonType(): GroupComparisonValue {
    return GroupComparisonType._None;
  }
}
