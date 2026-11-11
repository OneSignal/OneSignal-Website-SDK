import { OPERATION_NAME } from '../constants';
import { Operation, type OperationOpts } from './Operation';

type Property = string;
export type PropertyValue = {
  tags: Record<string, string>;
  [key: string]: string | Record<string, string>;
};

export type SetPropertyOpts<P extends Property = string> = OperationOpts & {
  property: P;
  value: PropertyValue[P];
};

/**
 * An Operation to update a property related to a specific user.
 */
export class SetPropertyOperation<P extends Property = string> extends Operation<{
  property: P;
  value: PropertyValue[P];
}> {
  constructor(opts?: SetPropertyOpts<P>) {
    super(OPERATION_NAME._SetProperty, opts?.appId, opts?.onesignalId, opts?.externalId);
    if (opts?.property && opts.value) {
      this._property = opts.property;
      this.value = opts.value;
    }
  }

  /**
   * The property that is to be updated against the user.
   */
  get _property(): string {
    return this._getProperty('property');
  }
  private set _property(value: P) {
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
