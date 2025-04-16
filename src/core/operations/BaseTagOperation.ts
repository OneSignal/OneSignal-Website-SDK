import { IDManager } from 'src/shared/managers/IDManager';
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
    super(operationName);
    if (appId && onesignalId && key) {
      this.appId = appId;
      this.onesignalId = onesignalId;
      this.key = key;
    }
  }

  /**
   * The application ID this subscription will be created under.
   */
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

  /**
   * The tag key.
   */
  get key(): string {
    return this.getProperty<string>('key');
  }
  protected set key(value: string) {
    this.setProperty<string>('key', value);
  }

  override get createComparisonKey(): string {
    return '';
  }

  override get modifyComparisonKey(): string {
    return `${this.appId}.User.${this.onesignalId}`;
  }

  override get groupComparisonType(): GroupComparisonValue {
    return GroupComparisonType.ALTER;
  }

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
