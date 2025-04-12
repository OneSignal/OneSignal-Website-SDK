import { IDManager } from 'src/shared/managers/IDManager';
import { OPERATION_NAME } from '../executors/constants';

import {
  GroupComparisonType,
  GroupComparisonValue,
  Operation,
} from './Operation';

// Implements logic similar to Android SDK's SetAliasOperation
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/user/internal/operations/SetAliasOperation.kt
export class SetAliasOperation extends Operation {
  constructor(
    appId?: string,
    onesignalId?: string,
    label?: string,
    value?: string,
  ) {
    super(OPERATION_NAME.SET_ALIAS);
    if (appId && onesignalId && label && value) {
      this.appId = appId;
      this.onesignalId = onesignalId;
      this.label = label;
      this.value = value;
    }
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

  get value(): string {
    return this.getProperty<string>('value');
  }

  private set value(value: string) {
    this.setProperty<string>('value', value);
  }

  override get createComparisonKey(): string {
    return '';
  }

  override get modifyComparisonKey(): string {
    return `${this.appId}.User.${this.onesignalId}.Identity.${this.label}`;
  }

  override get groupComparisonType(): GroupComparisonValue {
    return GroupComparisonType.ALTER;
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
