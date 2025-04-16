import { GroupComparisonValue, Operation } from './Operation';

/**
 * Base class for alias-related operations
 */
export abstract class BaseAliasOperation extends Operation {
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
    return this.getProperty<string>('label');
  }
  protected set label(value: string) {
    this.setProperty<string>('label', value);
  }

  abstract override get modifyComparisonKey(): string;

  abstract override get groupComparisonType(): GroupComparisonValue;
}
