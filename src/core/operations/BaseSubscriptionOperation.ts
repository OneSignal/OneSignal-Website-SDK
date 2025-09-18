import { IDManager } from 'src/shared/managers/IDManager';
import { Operation } from './Operation';

export type BaseSubOp = {
  subscriptionId: string;
};

/**
 * Base class for subscription-related operations that just need a subscriptionId
 */
export abstract class BaseSubscriptionOperation<
  U extends object = BaseSubOp,
  T extends U & BaseSubOp = U & BaseSubOp,
> extends Operation<T> {
  constructor(
    operationName: string,
    appId?: string,
    onesignalId?: string,
    subscriptionId?: string,
  ) {
    super(operationName, appId, onesignalId);
    if (subscriptionId) this.subscriptionId = subscriptionId;
  }

  /**
   * The subscription ID for the operation. This ID *may* be locally generated
   * and can be checked via IDManager.isLocalId to ensure correct processing.
   */
  get subscriptionId(): string {
    return this._getProperty('subscriptionId');
  }
  protected set subscriptionId(value: string) {
    this._setProperty('subscriptionId', value);
  }

  override get createComparisonKey(): string {
    return `${this.appId}.User.${this.onesignalId}`;
  }

  override get modifyComparisonKey(): string {
    return `${this.appId}.User.${this.onesignalId}.Subscription.${this.subscriptionId}`;
  }

  override get canStartExecute(): boolean {
    return (
      !IDManager._isLocalId(this.onesignalId) &&
      !IDManager._isLocalId(this.subscriptionId)
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
