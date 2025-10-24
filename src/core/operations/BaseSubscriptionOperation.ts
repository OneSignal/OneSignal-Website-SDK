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
    if (subscriptionId) this._subscriptionId = subscriptionId;
  }

  /**
   * The subscription ID for the operation. This ID *may* be locally generated
   * and can be checked via IDManager.isLocalId to ensure correct processing.
   */
  get _subscriptionId(): string {
    return this._getProperty('subscriptionId');
  }
  protected set _subscriptionId(value: string) {
    this._setProperty('subscriptionId', value);
  }

  override get _createComparisonKey(): string {
    return `${this._appId}.User.${this._onesignalId}`;
  }

  override get _modifyComparisonKey(): string {
    return `${this._appId}.User.${this._onesignalId}.Subscription.${this._subscriptionId}`;
  }

  override get _canStartExecute(): boolean {
    return (
      !IDManager._isLocalId(this._onesignalId) &&
      !IDManager._isLocalId(this._subscriptionId)
    );
  }

  override get _applyToRecordId(): string {
    return this._subscriptionId;
  }

  override _translateIds(map: Record<string, string>): void {
    super._translateIds(map);
    if (map[this._subscriptionId]) {
      this._subscriptionId = map[this._subscriptionId];
    }
  }
}
