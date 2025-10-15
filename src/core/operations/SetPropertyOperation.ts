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
    return this._getProperty('property');
  }
  private set property(value: P) {
    this._setProperty('property', value);
  }

  /**
   * The value of that property to update it to.
   */
  get value() {
    return this._getProperty('value') as PropertyValue[P];
  }
  private set value(_value) {
    this._setProperty('value', _value);
  }

  override get _modifyComparisonKey(): string {
    return `${this._appId}.User.${this._onesignalId}`;
  }
}
