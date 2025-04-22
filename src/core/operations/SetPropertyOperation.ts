import { OPERATION_NAME } from '../constants';

import { Operation } from './Operation';

type PropertyOp = {
  property: string;
  value: unknown;
};

/**
 * An Operation to update a property related to a specific user.
 */
export class SetPropertyOperation extends Operation<PropertyOp> {
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
    return this.getProperty('property');
  }
  private set property(value: string) {
    this.setProperty('property', value);
  }

  /**
   * The value of that property to update it to.
   */
  get value(): unknown {
    return this.getProperty('value');
  }
  private set value(value: unknown) {
    this.setProperty('value', value);
  }

  override get modifyComparisonKey(): string {
    return `${this.appId}.User.${this.onesignalId}`;
  }
}
