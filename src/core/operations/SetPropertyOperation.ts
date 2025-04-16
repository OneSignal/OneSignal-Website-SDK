import { OPERATION_NAME } from '../executors/constants';

import { Operation } from './Operation';

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
    super(OPERATION_NAME.SET_PROPERTY, appId, onesignalId);
    if (property) {
      this.property = property;
      this.value = value;
    }
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

  override get modifyComparisonKey(): string {
    return `${this.appId}.User.${this.onesignalId}`;
  }
}
