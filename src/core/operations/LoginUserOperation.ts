import { IDManager } from 'src/shared/managers/IDManager';
import { OPERATION_NAME } from '../constants';
import {
  GroupComparisonType,
  type GroupComparisonValue,
  Operation,
} from './Operation';

type ILoginOp = {
  externalId?: string;
  existingOnesignalId?: string;
};

/**
 * An Operation to login the user with the externalId provided. Logging in a user will do the
 * following:
 *
 * 1. Attempt to give the user identified by existingOnesignalId an alias of externalId. If
 *    this succeeds the existing user becomes
 */
export class LoginUserOperation extends Operation<ILoginOp> {
  constructor();
  constructor(
    appId: string,
    onesignalId: string | undefined,
    externalId?: string,
    existingOneSignalId?: string,
  );
  constructor(
    appId?: string,
    onesignalId?: string,
    externalId?: string,
    existingOneSignalId?: string,
  ) {
    super(OPERATION_NAME.LOGIN_USER, appId, onesignalId);
    if (externalId) this.externalId = externalId;
    if (existingOneSignalId) this.existingOnesignalId = existingOneSignalId;
  }

  /**
   * The optional external ID of this newly logged-in user. Must be unique for the appId.
   */
  get externalId(): string | undefined {
    return this.getProperty('externalId');
  }
  private set externalId(value: string) {
    this.setProperty('externalId', value);
  }

  /**
   * The user ID of an existing user the externalId will be attempted to be associated to first.
   * When null (or non-null but unsuccessful), a new user will be upserted. This ID *may* be locally generated
   * and can be checked via IDManager.isLocalId to ensure correct processing.
   */
  get existingOnesignalId(): string | undefined {
    return this.getProperty('existingOnesignalId');
  }
  private set existingOnesignalId(value: string) {
    this.setProperty('existingOnesignalId', value);
  }

  override get createComparisonKey(): string {
    return `${this.appId}.User.${this.onesignalId}`;
  }

  override get modifyComparisonKey(): string {
    return '';
  }

  override get groupComparisonType(): GroupComparisonValue {
    return GroupComparisonType.CREATE;
  }

  override get canStartExecute(): boolean {
    return (
      !this.existingOnesignalId ||
      !IDManager.isLocalId(this.existingOnesignalId)
    );
  }

  override get applyToRecordId(): string {
    return this.existingOnesignalId ?? this.onesignalId;
  }

  override translateIds(map: Record<string, string>): void {
    if (this.existingOnesignalId && map[this.existingOnesignalId]) {
      this.existingOnesignalId = map[this.existingOnesignalId];
    }
  }
}
