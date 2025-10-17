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
    this._name = name;
    if (appId) this._appId = appId;
    if (onesignalId) this._onesignalId = onesignalId;
  }

  get _name(): string {
    return this._getProperty('name');
  }
  private set _name(value: string) {
    this._setProperty('name', value);
  }

  /**
   * The application ID this subscription will be created under.
   */
  get _appId(): string {
    return this._getProperty('appId');
  }
  protected set _appId(value: string) {
    this._setProperty('appId', value);
  }

  get _onesignalId(): string {
    return this._getProperty('onesignalId');
  }
  protected set _onesignalId(value: string) {
    this._setProperty('onesignalId', value);
  }

  /**
   * This is a unique id that points to a record this operation will affect.
   * Example: If the operation is updating tags on a User this will be the onesignalId.
   */
  get _applyToRecordId(): string {
    return this._onesignalId;
  }

  /**
   * The key of this operation for when the starting operation has a `groupComparisonType`
   * of `GroupComparisonType.CREATE`
   */
  get _createComparisonKey(): string {
    return '';
  }

  /**
   * The key of this operation for when the starting operation has a `groupComparisonType`
   * of `GroupComparisonType.ALTER`
   */
  abstract get _modifyComparisonKey(): string;

  /**
   * The comparison type to use when this operation is the starting operation, in terms of
   * which operations can be grouped with it.
   */
  get _groupComparisonType(): GroupComparisonValue {
    return GroupComparisonType.ALTER;
  }

  /**
   * Whether the operation can currently execute given its current state.
   */
  get _canStartExecute(): boolean {
    return !IDManager._isLocalId(this._onesignalId);
  }

  /**
   * Called when an operation has resolved a local ID to a backend ID.
   * Any IDs within the operation that could be local should be translated at this time.
   */
  _translateIds(map: Record<string, string>): void {
    if (map[this._onesignalId]) {
      this._onesignalId = map[this._onesignalId];
    }
  }
}
