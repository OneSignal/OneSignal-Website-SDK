import { IDManager } from 'src/shared/managers/IDManager';
import { Model } from '../models/Model';

export const GroupComparisonType = {
  CREATE: 0,
  ALTER: 1,
  NONE: 2,
} as const;

export type GroupComparisonValue =
  (typeof GroupComparisonType)[keyof typeof GroupComparisonType];

type BaseOperation = {
  name: string;
  appId: string;
  onesignalId: string;
};

export abstract class Operation<
  B extends object = BaseOperation,
  T extends B & BaseOperation = B & BaseOperation,
> extends Model<T> {
  constructor(name: string, appId?: string, onesignalId?: string) {
    super();
    this.name = name;
    if (appId) this.appId = appId;
    if (onesignalId) this.onesignalId = onesignalId;
  }

  get name(): string {
    return this._getProperty('name');
  }
  private set name(value: string) {
    this._setProperty('name', value);
  }

  /**
   * The application ID this subscription will be created under.
   */
  get appId(): string {
    return this._getProperty('appId');
  }
  protected set appId(value: string) {
    this._setProperty('appId', value);
  }

  get onesignalId(): string {
    return this._getProperty('onesignalId');
  }
  protected set onesignalId(value: string) {
    this._setProperty('onesignalId', value);
  }

  /**
   * This is a unique id that points to a record this operation will affect.
   * Example: If the operation is updating tags on a User this will be the onesignalId.
   */
  get applyToRecordId(): string {
    return this.onesignalId;
  }

  /**
   * The key of this operation for when the starting operation has a `groupComparisonType`
   * of `GroupComparisonType.CREATE`
   */
  get createComparisonKey(): string {
    return '';
  }

  /**
   * The key of this operation for when the starting operation has a `groupComparisonType`
   * of `GroupComparisonType.ALTER`
   */
  abstract get modifyComparisonKey(): string;

  /**
   * The comparison type to use when this operation is the starting operation, in terms of
   * which operations can be grouped with it.
   */
  get groupComparisonType(): GroupComparisonValue {
    return GroupComparisonType.ALTER;
  }

  /**
   * Whether the operation can currently execute given its current state.
   */
  get canStartExecute(): boolean {
    return !IDManager._isLocalId(this.onesignalId);
  }

  /**
   * Called when an operation has resolved a local ID to a backend ID.
   * Any IDs within the operation that could be local should be translated at this time.
   */
  translateIds(map: Record<string, string>): void {
    if (map[this.onesignalId]) {
      this.onesignalId = map[this.onesignalId];
    }
  }

  toString(): string {
    return JSON.stringify(this.toJSON());
  }
}
