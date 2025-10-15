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

  override get _canStartExecute(): boolean {
    return !IDManager._isLocalId(this._onesignalId);
  }

  override get _applyToRecordId(): string {
    return this._onesignalId;
  }

  override _translateIds(map: Record<string, string>): void {
    if (map[this._onesignalId]) {
      this._onesignalId = map[this._onesignalId];
    }
  }
}
