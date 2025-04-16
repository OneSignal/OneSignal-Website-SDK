import { IDManager } from 'src/shared/managers/IDManager';
import { OPERATION_NAME } from '../executors/constants';

import {
  GroupComparisonType,
  GroupComparisonValue,
  Operation,
} from './Operation';

/**
 * An Operation to create/update a tag in the OneSignal backend. The tag will
 * be associated to the user with the appId and onesignalId provided.
 */
export class SetTagOperation extends Operation {
  constructor();
  constructor(appId: string, onesignalId: string, key: string, value: string);
  constructor(
    appId?: string,
    onesignalId?: string,
    key?: string,
    value?: string,
  ) {
    super(OPERATION_NAME.SET_TAG);
    if (appId && onesignalId && key && value) {
      this.appId = appId;
      this.onesignalId = onesignalId;
      this.key = key;
      this.value = value;
    }
  }

  /**
   * The application ID this subscription will be created under.
   */
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

  /**
   * The tag key.
   */
  get key(): string {
    return this.getProperty<string>('key');
  }
  private set key(value: string) {
    this.setProperty<string>('key', value);
  }

  /**
   * The new/updated tag value.
   */
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
    return `${this.appId}.User.${this.onesignalId}`;
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
