import { OPERATION_NAME } from '../constants';

import { Operation } from './Operation';

// Define a mapping of property names to their expected value types
interface PropertyValueMap {
  tags: Record<string, string>;
  [key: string]: string | Record<string, string>;
}

type PropertyOp = {
  property: string;
  value: unknown;
};

/**
 * An Operation to update a property related to a specific user.
 */
export class SetPropertyOperation<
  T extends keyof PropertyValueMap = keyof PropertyValueMap,
> extends Operation<PropertyOp> {
  constructor();
  constructor(
    appId: string,
    onesignalId: string,
    property: T,
    value: PropertyValueMap[T],
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
