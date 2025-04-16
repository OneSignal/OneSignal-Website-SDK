import { IDManager } from 'src/shared/managers/IDManager';
import { OPERATION_NAME } from '../executors/constants';

import {
  GroupComparisonType,
  GroupComparisonValue,
  Operation,
} from './Operation';

/**
 * An Operation to retrieve a user from the OneSignal backend. The resulting user
 * will replace the current user.
 */
export class RefreshUserOperation extends Operation {
  constructor();
  constructor(appId: string, onesignalId: string);
  constructor(appId?: string, onesignalId?: string) {
    super(OPERATION_NAME.REFRESH_USER);
    if (appId && onesignalId) {
      this.appId = appId;
      this.onesignalId = onesignalId;
    }
  }

  /**
   * The application ID this subscription will be created under.
   */
  get appId(): string {
    return this.getProperty<string>('appId');
  }
  private set appId(value: string) {
    this.setProperty<string>('appId', value);
  }

  /**
   * The user ID this subscription will be associated with. This ID *may* be locally generated
   * and can be checked via IDManager.isLocalId to ensure correct processing.
   */
  get onesignalId(): string {
    return this.getProperty<string>('onesignalId');
  }
  private set onesignalId(value: string) {
    this.setProperty<string>('onesignalId', value);
  }

  override get createComparisonKey(): string {
    return `${this.appId}.User.${this.onesignalId}.Refresh`;
  }

  override get modifyComparisonKey(): string {
    return `${this.appId}.User.${this.onesignalId}.Refresh`;
  }

  override get groupComparisonType(): GroupComparisonValue {
    return GroupComparisonType.CREATE;
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
