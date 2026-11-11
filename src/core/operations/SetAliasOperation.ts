import { OPERATION_NAME } from '../constants';
import { type AliasOpts, BaseAliasOperation } from './BaseAliasOperation';

type AliasOp = {
  value: string;
};

export type SetAliasOpts = AliasOpts & AliasOp;

// Implements logic similar to Android SDK's SetAliasOperation
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/user/internal/operations/SetAliasOperation.kt
export class SetAliasOperation extends BaseAliasOperation<AliasOp> {
  constructor(opts?: SetAliasOpts) {
    super(OPERATION_NAME._SetAlias, opts);
    if (opts?.value) this.value = opts.value;
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
