import { IDManager } from 'src/shared/managers/IDManager';
import { OPERATION_NAME } from '../executors/constants';
import {
  GroupComparisonType,
  GroupComparisonValue,
  Operation,
} from './Operation';

// Implements logic similar to Android SDK's DeleteAliasOperation
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/user/internal/operations/DeleteAliasOperation.kt
export class DeleteAliasOperation extends Operation {
  constructor(appId: string, onesignalId: string, label: string) {
    super(OPERATION_NAME.DELETE_ALIAS);
    this.appId = appId;
    this.onesignalId = onesignalId;
    this.label = label;
  }

  get appId(): string {
    return this.getProperty<string>('appId');
  }
  private set appId(value: string) {
    this.setProperty<string>('appId', value);
  }

  get onesignalId(): string {
    return this.getProperty<string>('onesignalId');
  }
  private set onesignalId(value: string) {
    this.setProperty<string>('onesignalId', value);
  }

  get label(): string {
    return this.getProperty<string>('label');
  }
  private set label(value: string) {
    this.setProperty<string>('label', value);
  }

  override get createComparisonKey(): string {
    return '';
  }

  override get modifyComparisonKey(): string {
    return `${this.appId}.User.${this.onesignalId}.Alias.${this.label}`;
  }

  override get groupComparisonType(): GroupComparisonValue {
    return GroupComparisonType.NONE;
  }

  override get canStartExecute(): boolean {
    return !IDManager.isLocalId(this.onesignalId);
  }

  override get applyToRecordId(): string {
    return this.onesignalId;
  }

  override translateIds(map: Record<string, string>): void {
    if (map[this.onesignalId]) {
      this.onesignalId = map[this.onesignalId];
    }
  }
}
