import { OPERATION_NAME } from '../constants';

import { Operation } from './Operation';

type Property = 'tags' | string;
export type PropertyValue = {
  tags: Record<string, string>;
  [key: string]: string | Record<string, string>;
};

/**
 * An Operation to update a property related to a specific user.
 */
export class SetPropertyOperation<
  P extends Property = string,
> extends Operation<{
  property: P;
  value: PropertyValue[P];
}> {
  constructor();
  constructor(
    appId: string,
    onesignalId: string,
    property: P,
    value: PropertyValue[P],
  );
  constructor(
    appId?: string,
    onesignalId?: string,
    property?: P,
    value?: PropertyValue[P],
  ) {
    super(OPERATION_NAME.SET_PROPERTY, appId, onesignalId);
    if (property && value) {
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
  private set property(value: P) {
    this.setProperty('property', value);
  }

  /**
   * The value of that property to update it to.
   */
  get value() {
    return this.getProperty('value') as PropertyValue[P];
  }
  private set value(_value) {
    this.setProperty('value', _value);
  }

  override get modifyComparisonKey(): string {
    return `${this.appId}.User.${this.onesignalId}`;
  }
}
