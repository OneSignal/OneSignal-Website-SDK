import { OPERATION_NAME } from '../constants';
import { BaseSubscriptionOperation } from './BaseSubscriptionOperation';
import { GroupComparisonType, type GroupComparisonValue } from './Operation';

/**
 * An Operation to delete a subscription from the OneSignal backend.
 */
export class DeleteSubscriptionOperation extends BaseSubscriptionOperation {
  constructor();
  constructor(appId: string, onesignalId: string, subscriptionId: string, externalId?: string);
  constructor(appId?: string, onesignalId?: string, subscriptionId?: string, externalId?: string) {
    super(OPERATION_NAME._DeleteSubscription, appId, onesignalId, subscriptionId, externalId);
  }

  override get _groupComparisonType(): GroupComparisonValue {
    return GroupComparisonType._None;
  }
}
