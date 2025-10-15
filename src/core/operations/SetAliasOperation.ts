import { OPERATION_NAME } from '../constants';
import { BaseAliasOperation } from './BaseAliasOperation';

type AliasOp = {
  value: string;
};

// Implements logic similar to Android SDK's SetAliasOperation
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/user/internal/operations/SetAliasOperation.kt
export class SetAliasOperation extends BaseAliasOperation<AliasOp> {
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
    return this._getProperty('value');
  }
  private set value(value: string) {
    this._setProperty('value', value);
  }

  override get _modifyComparisonKey(): string {
    return `${this._appId}.User.${this._onesignalId}.Identity.${this.label}`;
  }
}
