import { OPERATION_NAME } from '../executors/constants';
import { BaseSubscriptionOperation } from './BaseSubscriptionOperation';
import { Subscription } from './types';

/**
 * An Operation to update an existing subscription in the OneSignal backend.
 */
export class UpdateSubscriptionOperation extends BaseSubscriptionOperation {
  constructor(subscription?: Subscription) {
    super(
      OPERATION_NAME.UPDATE_SUBSCRIPTION,
      subscription?.appId,
      subscription?.onesignalId,
      subscription,
    );
  }
}
