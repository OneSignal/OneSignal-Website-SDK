import { OPERATION_NAME } from '../executors/constants';
import {
  GroupComparisonType,
  GroupComparisonValue,
  Operation,
} from './Operation';

/**
 * An Operation to login the user with the subscriptionId provided.
 */
export class LoginUserFromSubscriptionOperation extends Operation {
  constructor();
  constructor(appId: string, onesignalId: string, subscriptionId: string);
  constructor(appId?: string, onesignalId?: string, subscriptionId?: string) {
    super(OPERATION_NAME.LOGIN_USER_FROM_SUBSCRIPTION_USER, appId, onesignalId);
    if (subscriptionId) {
      this.subscriptionId = subscriptionId;
    }
  }

  /**
   * The optional external ID of this newly logged-in user. Must be unique for the appId.
   */
  get subscriptionId(): string {
    return this.getProperty<string>('subscriptionId');
  }
  private set subscriptionId(value: string) {
    this.setProperty<string>('subscriptionId', value);
  }

  private getKey(): string {
    return `${this.appId}.Subscription.${this.subscriptionId}.Login`;
  }

  override get createComparisonKey(): string {
    return this.getKey();
  }

  override get modifyComparisonKey(): string {
    return this.getKey();
  }

  override get groupComparisonType(): GroupComparisonValue {
    return GroupComparisonType.NONE;
  }

  override get canStartExecute(): boolean {
    return true;
  }

  override get applyToRecordId(): string {
    return this.subscriptionId;
  }
}
