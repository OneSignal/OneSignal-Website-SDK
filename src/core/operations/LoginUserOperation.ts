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
    super(OPERATION_NAME._LoginUser, appId, onesignalId);
    if (externalId) this._externalId = externalId;
    if (existingOneSignalId) this._existingOnesignalId = existingOneSignalId;
  }

  /**
   * The optional external ID of this newly logged-in user. Must be unique for the appId.
   */
  get _externalId(): string | undefined {
    return this._getProperty('externalId');
  }
  private set _externalId(value: string) {
    this._setProperty('externalId', value);
  }

  /**
   * The user ID of an existing user the externalId will be attempted to be associated to first.
   * When null (or non-null but unsuccessful), a new user will be upserted. This ID *may* be locally generated
   * and can be checked via IDManager.isLocalId to ensure correct processing.
   */
  get _existingOnesignalId(): string | undefined {
    return this._getProperty('existingOnesignalId');
  }
  private set _existingOnesignalId(value: string) {
    this._setProperty('existingOnesignalId', value);
  }

  override get _createComparisonKey(): string {
    return `${this._appId}.User.${this._onesignalId}`;
  }

  override get _modifyComparisonKey(): string {
    return '';
  }

  override get _groupComparisonType(): GroupComparisonValue {
    return GroupComparisonType._Create;
  }

  override get _canStartExecute(): boolean {
    return (
      !this._existingOnesignalId ||
      !IDManager._isLocalId(this._existingOnesignalId)
    );
  }

  override get _applyToRecordId(): string {
    return this._existingOnesignalId ?? this._onesignalId;
  }

  override _translateIds(map: Record<string, string>): void {
    if (this._existingOnesignalId && map[this._existingOnesignalId]) {
      this._existingOnesignalId = map[this._existingOnesignalId];
    }
  }
}
