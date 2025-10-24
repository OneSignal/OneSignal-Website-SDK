import { Operation } from './Operation';

type AliasOperation = {
  label: string;
};

/**
 * Base class for alias-related operations
 */
export abstract class BaseAliasOperation<
  U extends object = AliasOperation,
  T extends U & AliasOperation = U & AliasOperation,
> extends Operation<T> {
  constructor(
    operationName: string,
    appId?: string,
    onesignalId?: string,
    label?: string,
  ) {
    super(operationName, appId, onesignalId);
    if (label) {
      this._label = label;
    }
  }

  get _label(): string {
    return this._getProperty('label');
  }
  protected set _label(value: string | undefined) {
    this._setProperty('label', value);
  }
}
