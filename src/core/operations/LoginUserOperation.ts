import { IDManager } from 'src/shared/managers/IDManager';
import { OPERATION_NAME } from '../constants';
import {
  GroupComparisonType,
  GroupComparisonValue,
  Operation,
} from './Operation';

/**
 * An Operation to login the user with the externalId provided. Logging in a user will do the
 * following:
 *
 * 1. Attempt to give the user identified by existingOnesignalId an alias of externalId. If
 *    this succeeds the existing user becomes
 */
export class LoginUserOperation extends Operation {
  constructor();
  constructor(
    appId: string,
    onesignalId: string,
    externalId?: string,
    existingOneSignalId?: string | null,
  );
  constructor(
    appId?: string,
    onesignalId?: string,
    externalId?: string,
    existingOneSignalId: string | null = null,
  ) {
    super(OPERATION_NAME.LOGIN_USER, appId, onesignalId);
    if (externalId) this.externalId = externalId;
    this.existingOnesignalId = existingOneSignalId;
  }

  /**
   * The optional external ID of this newly logged-in user. Must be unique for the appId.
   */
  get externalId(): string | undefined {
    return this.getProperty<string | undefined>('externalId');
  }
  private set externalId(value: string) {
    this.setProperty<string>('externalId', value);
  }

  /**
   * The user ID of an existing user the externalId will be attempted to be associated to first.
   * When null (or non-null but unsuccessful), a new user will be upserted. This ID *may* be locally generated
   * and can be checked via IDManager.isLocalId to ensure correct processing.
   */
  get existingOnesignalId(): string | null {
    return this.getProperty<string | null>('existingOnesignalId');
  }
  private set existingOnesignalId(value: string | null) {
    this.setProperty<string>('existingOnesignalId', value);
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
      this.existingOnesignalId === null ||
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
