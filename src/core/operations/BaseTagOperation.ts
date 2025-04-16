import {
  GroupComparisonType,
  GroupComparisonValue,
  Operation,
} from './Operation';

/**
 * Base class for tag-related operations
 */
export abstract class BaseTagOperation extends Operation {
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
    return this.getProperty<string>('key');
  }
  protected set key(value: string) {
    this.setProperty<string>('key', value);
  }

  override get modifyComparisonKey(): string {
    return `${this.appId}.User.${this.onesignalId}`;
  }

  override get groupComparisonType(): GroupComparisonValue {
    return GroupComparisonType.ALTER;
  }
}
