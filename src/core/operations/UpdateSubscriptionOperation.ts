import { OPERATION_NAME } from '../constants';
import {
  BaseFullSubscriptionOperation,
  type SubscriptionWithAppId,
} from './BaseFullSubscriptionOperation';

/**
 * An Operation to update an existing subscription in the OneSignal backend.
 */
export class UpdateSubscriptionOperation extends BaseFullSubscriptionOperation {
  constructor(subscription?: SubscriptionWithAppId) {
    super(
      OPERATION_NAME._UpdateSubscription,
      subscription?.appId,
      subscription?.onesignalId,
      subscription,
    );
  }
}
