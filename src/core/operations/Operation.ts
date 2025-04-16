import { Model } from '../models/Model';

export const GroupComparisonType = {
  CREATE: 0,
  ALTER: 1,
  NONE: 2,
} as const;

export type GroupComparisonValue =
  (typeof GroupComparisonType)[keyof typeof GroupComparisonType];

export abstract class Operation extends Model {
  constructor(name: string) {
    super();
    this.name = name;
  }

  get name(): string {
    return this.getProperty<string>('name');
  }

  private set name(value: string) {
    this.setProperty<string>('name', value);
  }

  /**
   * This is a unique id that points to a record this operation will affect.
   * Example: If the operation is updating tags on a User this will be the onesignalId.
   */
  abstract get applyToRecordId(): string;

  /**
   * The key of this operation for when the starting operation has a `groupComparisonType`
   * of `GroupComparisonType.CREATE`
   */
  abstract get createComparisonKey(): string;

  /**
   * The key of this operation for when the starting operation has a `groupComparisonType`
   * of `GroupComparisonType.ALTER`
   */
  abstract get modifyComparisonKey(): string;

  /**
   * The comparison type to use when this operation is the starting operation, in terms of
   * which operations can be grouped with it.
   */
  abstract get groupComparisonType(): GroupComparisonValue;

  /**
   * Whether the operation can currently execute given its current state.
   */
  abstract get canStartExecute(): boolean;

  /**
   * Called when an operation has resolved a local ID to a backend ID.
   * Any IDs within the operation that could be local should be translated at this time.
   */
  translateIds(map: Record<string, string>): void {
    // Optional override
  }

  toString(): string {
    return JSON.stringify(this.toJSON());
  }
}
