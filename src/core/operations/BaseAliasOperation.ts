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
      this.label = label;
    }
  }

  get label(): string {
    return this.getProperty('label');
  }
  protected set label(value: string | null) {
    this.setProperty('label', value);
  }
}
