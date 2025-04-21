import { OPERATION_NAME } from '../constants';
import {
  GroupComparisonType,
  GroupComparisonValue,
  Operation,
} from './Operation';

interface LoginUserOperation {
  subscriptionId: string;
}

// Implements logic similar to Android SDK's LoginUserFromSubscriptionOperation
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/user/internal/operations/LoginUserFromSubscriptionOperation.kt
export class LoginUserFromSubscriptionOperation extends Operation<LoginUserOperation> {
  constructor();
  constructor(appId: string, onesignalId: string, subscriptionId: string);
  constructor(appId?: string, onesignalId?: string, subscriptionId?: string) {
    super(OPERATION_NAME.LOGIN_USER_FROM_SUBSCRIPTION_USER);

    if (appId && onesignalId && subscriptionId) {
      this.appId = appId;
      this.onesignalId = onesignalId;
      this.subscriptionId = subscriptionId;
    }
  }

  get subscriptionId(): string {
    return this.getProperty('subscriptionId');
  }
  private set subscriptionId(value: string) {
    this.setProperty('subscriptionId', value);
  }

  private get comparisonKey(): string {
    return `${this.appId}.Subscription.${this.subscriptionId}.Login`;
  }
  get createComparisonKey(): string {
    return this.comparisonKey;
  }
  get modifyComparisonKey(): string {
    return this.comparisonKey;
  }

  get groupComparisonType(): GroupComparisonValue {
    return GroupComparisonType.NONE;
  }

  get canStartExecute(): boolean {
    return true;
  }

  get applyToRecordId(): string {
    return this.subscriptionId;
  }
}
