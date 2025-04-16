import { Operation } from './Operation';

/**
 * Base class for subscription-related operations
 */
export abstract class BaseSubscriptionOperation extends Operation {
  constructor(
    operationName: string,
    appId?: string,
    onesignalId?: string,
    subscriptionId?: string,
  ) {
    super(operationName, appId, onesignalId);
    if (subscriptionId) {
      this.subscriptionId = subscriptionId;
    }
  }

  /**
   * The subscription ID for the operation. This ID *may* be locally generated
   * and can be checked via IDManager.isLocalId to ensure correct processing.
   */
  get subscriptionId(): string {
    return this.getProperty<string>('subscriptionId');
  }
  protected set subscriptionId(value: string) {
    this.setProperty<string>('subscriptionId', value);
  }

  override get createComparisonKey(): string {
    return `${this.appId}.User.${this.onesignalId}`;
  }

  override get modifyComparisonKey(): string {
    return `${this.appId}.User.${this.onesignalId}.Subscription.${this.subscriptionId}`;
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
