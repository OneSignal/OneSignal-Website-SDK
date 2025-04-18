import { OPERATION_NAME } from '../constants';
import {
  BaseSubscriptionOperation,
  SubscriptionWithAppId,
} from './BaseSubscriptionOperation';

/**
 * An Operation to update an existing subscription in the OneSignal backend.
 */
export class UpdateSubscriptionOperation extends BaseSubscriptionOperation {
  constructor(subscription?: SubscriptionWithAppId) {
    super(
      OPERATION_NAME.UPDATE_SUBSCRIPTION,
      subscription?.appId,
      subscription?.onesignalId,
      subscription,
    );
  }
}
