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
    super(OPERATION_NAME._UpdateSubscription, subscription);
  }

  // The server rejects a bearer on PATCH subscriptions/{id} and accepts the
  // request without one, so the SDK never signs it and must not wait for a token.
  override get _requiresJwt(): boolean {
    return false;
  }
}
