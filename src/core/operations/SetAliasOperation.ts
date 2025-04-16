import { OPERATION_NAME } from '../executors/constants';
import { BaseAliasOperation } from './BaseAliasOperation';
import { GroupComparisonType, GroupComparisonValue } from './Operation';

// Implements logic similar to Android SDK's SetAliasOperation
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/user/internal/operations/SetAliasOperation.kt
export class SetAliasOperation extends BaseAliasOperation {
  constructor();
  constructor(appId: string, onesignalId: string, label: string, value: string);
  constructor(
    appId?: string,
    onesignalId?: string,
    label?: string,
    value?: string,
  ) {
    super(OPERATION_NAME.SET_ALIAS, appId, onesignalId, label);
    if (value) this.value = value;
  }

  get value(): string {
    return this.getProperty<string>('value');
  }
  private set value(value: string) {
    this.setProperty<string>('value', value);
  }

  override get modifyComparisonKey(): string {
    return `${this.appId}.User.${this.onesignalId}.Identity.${this.label}`;
  }

  override get groupComparisonType(): GroupComparisonValue {
    return GroupComparisonType.ALTER;
  }
}
