import { IDManager } from 'src/shared/managers/IDManager';
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
    super(operationName);
    if (appId && onesignalId && label) {
      this.appId = appId;
      this.onesignalId = onesignalId;
      this.label = label;
    }
  }

  get appId(): string {
    return this.getProperty<string>('appId');
  }
  protected set appId(value: string) {
    this.setProperty<string>('appId', value);
  }

  get onesignalId(): string {
    return this.getProperty<string>('onesignalId');
  }
  protected set onesignalId(value: string) {
    this.setProperty<string>('onesignalId', value);
  }

  get label(): string {
    return this.getProperty<string>('label');
  }
  protected set label(value: string) {
    this.setProperty<string>('label', value);
  }

  override get createComparisonKey(): string {
    return '';
  }

  abstract override get modifyComparisonKey(): string;

  abstract override get groupComparisonType(): GroupComparisonValue;

  override get canStartExecute(): boolean {
    return !IDManager.isLocalId(this.onesignalId);
  }

  override get applyToRecordId(): string {
    return this.onesignalId;
  }

  override translateIds(map: Record<string, string>): void {
    if (map[this.onesignalId]) {
      this.onesignalId = map[this.onesignalId];
    }
  }
}
