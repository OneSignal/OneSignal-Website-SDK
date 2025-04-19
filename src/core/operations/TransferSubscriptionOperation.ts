import { IDManager } from 'src/shared/managers/IDManager';
import { OPERATION_NAME } from '../constants';
import {
  GroupComparisonType,
  GroupComparisonValue,
  Operation,
} from './Operation';

type TransferOp = {
  subscriptionId: string;
};

/**
 * An Operation to transfer a subscription to a new owner on the OneSignal backend.
 */
export class TransferSubscriptionOperation extends Operation<TransferOp> {
  constructor(appId: string, onesignalId: string, subscriptionId: string);
  constructor(appId?: string, onesignalId?: string, subscriptionId?: string) {
    super(OPERATION_NAME.TRANSFER_SUBSCRIPTION, appId, onesignalId);
    if (subscriptionId) {
      this.subscriptionId = subscriptionId;
    }
  }

  /**
   * The subscription ID for the operation. This ID *may* be locally generated
   * and can be checked via IDManager.isLocalId to ensure correct processing.
   */
  get subscriptionId(): string {
    return this.getProperty('subscriptionId');
  }
  protected set subscriptionId(value: string) {
    this.setProperty('subscriptionId', value);
  }

  override get createComparisonKey(): string {
    return `${this.appId}.User.${this.onesignalId}`;
  }
  override get modifyComparisonKey(): string {
    return `${this.appId}.Subscription.${this.subscriptionId}.Transfer`;
  }

  override get groupComparisonType(): GroupComparisonValue {
    return GroupComparisonType.NONE;
  }

  override get canStartExecute(): boolean {
    return (
      !IDManager.isLocalId(this.onesignalId) &&
      !IDManager.isLocalId(this.subscriptionId)
    );
  }

  override get applyToRecordId(): string {
    return this.subscriptionId;
  }

  override translateIds(map: Record<string, string>): void {
    super.translateIds(map);
    if (map[this.subscriptionId]) {
      this.subscriptionId = map[this.subscriptionId];
    }
  }
}
