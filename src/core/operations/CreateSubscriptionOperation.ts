import { IDManager } from 'src/shared/managers/IDManager';
import { OPERATION_NAME } from '../constants';
import {
  BaseFullSubscriptionOperation,
  type SubscriptionWithAppId,
} from './BaseFullSubscriptionOperation';

/**
 * An Operation to create a new subscription in the OneSignal backend. The subscription will
 * be associated to the user with the appId and onesignalId provided.
 */
export class CreateSubscriptionOperation extends BaseFullSubscriptionOperation {
  constructor(subscription?: SubscriptionWithAppId) {
    super(
      OPERATION_NAME.CREATE_SUBSCRIPTION,
      subscription?.appId,
      subscription?.onesignalId,
      subscription,
    );
  }

  override get canStartExecute(): boolean {
    return !IDManager.isLocalId(this.onesignalId);
  }

  override get applyToRecordId(): string {
    return this.onesignalId;
  }

  override translateIds(map: Record<string, string>): void {
    if (map[this.onesignalId]) {
      this.onesignalId = map[this.onesignalId];
    }
  }
}
