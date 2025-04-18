import { Operation } from './Operation';

type TagOperation = {
  key: string;
};

/**
 * Base class for tag-related operations
 */
export abstract class BaseTagOperation<
  U extends object = TagOperation,
  T extends U & TagOperation = U & TagOperation,
> extends Operation<T> {
  constructor(
    operationName: string,
    appId?: string,
    onesignalId?: string,
    key?: string,
  ) {
    super(operationName, appId, onesignalId);
    if (key) {
      this.key = key;
    }
  }

  /**
   * The tag key.
   */
  get key(): string {
    return this.getProperty('key');
  }
  protected set key(value: string) {
    this.setProperty('key', value);
  }

  override get modifyComparisonKey(): string {
    return `${this.appId}.User.${this.onesignalId}`;
  }
}
