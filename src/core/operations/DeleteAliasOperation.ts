import { OPERATION_NAME } from '../constants';
import { BaseAliasOperation } from './BaseAliasOperation';
import { GroupComparisonType, type GroupComparisonValue } from './Operation';

// Implements logic similar to Android SDK's DeleteAliasOperation
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/user/internal/operations/DeleteAliasOperation.kt
export class DeleteAliasOperation extends BaseAliasOperation {
  constructor();
  constructor(appId: string, onesignalId: string, label: string);
  constructor(appId?: string, onesignalId?: string, label?: string) {
    super(OPERATION_NAME._DeleteAlias, appId, onesignalId, label);
  }

  override get _modifyComparisonKey(): string {
    return `${this._appId}.User.${this._onesignalId}.Alias.${this._label}`;
  }

  override get _groupComparisonType(): GroupComparisonValue {
    return GroupComparisonType._None;
  }
}
