import { Operation, type OperationOpts } from './Operation';

type AliasOperation = {
  label: string;
};

export type AliasOpts = OperationOpts & AliasOperation;

/**
 * Base class for alias-related operations
 */
export abstract class BaseAliasOperation<
  U extends object = AliasOperation,
  T extends U & AliasOperation = U & AliasOperation,
> extends Operation<T> {
  constructor(operationName: string, opts?: AliasOpts) {
    super(operationName, opts?.appId, opts?.onesignalId, opts?.externalId);
    if (opts?.label) {
      this.label = opts.label;
    }
  }

  get label(): string {
    return this._getProperty('label');
  }
  protected set label(value: string | undefined) {
    this._setProperty('label', value);
  }
}
