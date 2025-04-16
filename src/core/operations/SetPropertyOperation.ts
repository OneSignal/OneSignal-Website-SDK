import { IDManager } from 'src/shared/managers/IDManager';
import { OPERATION_NAME } from '../executors/constants';

import {
  GroupComparisonType,
  GroupComparisonValue,
  Operation,
} from './Operation';

/**
 * An Operation to update a property related to a specific user.
 */
export class SetPropertyOperation extends Operation {
  constructor();
  constructor(
    appId: string,
    onesignalId: string,
    property: string,
    value: unknown,
  );
  constructor(
    appId?: string,
    onesignalId?: string,
    property?: string,
    value?: unknown,
  ) {
    super(OPERATION_NAME.SET_PROPERTY);
    if (appId && onesignalId && property) {
      this.appId = appId;
      this.onesignalId = onesignalId;
      this.property = property;
      this.value = value;
    }
  }

  /**
   * The OneSignal appId the purchase was captured under.
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
   * The property that is to be updated against the user.
   */
  get property(): string {
    return this.getProperty<string>('property');
  }
  private set property(value: string) {
    this.setProperty<string>('property', value);
  }

  /**
   * The value of that property to update it to.
   */
  get value(): unknown {
    return this.getProperty<unknown>('value');
  }
  private set value(value: unknown) {
    this.setProperty<unknown>('value', value);
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
