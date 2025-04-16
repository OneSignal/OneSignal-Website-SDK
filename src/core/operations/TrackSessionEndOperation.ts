import { IDManager } from 'src/shared/managers/IDManager';
import { OPERATION_NAME } from '../executors/constants';

import {
  GroupComparisonType,
  GroupComparisonValue,
  Operation,
} from './Operation';

/**
 * An Operation to track the ending of a session, related to a specific user.
 */
export class TrackSessionEndOperation extends Operation {
  constructor();
  constructor(appId: string, onesignalId: string, sessionTime: number);
  constructor(appId?: string, onesignalId?: string, sessionTime?: number) {
    super(OPERATION_NAME.TRACK_SESSION_END);
    if (appId && onesignalId && sessionTime) {
      this.appId = appId;
      this.onesignalId = onesignalId;
      this.sessionTime = sessionTime;
    }
  }

  /**
   * The OneSignal appId the session was captured under.
   */
  get appId(): string {
    return this.getProperty<string>('appId');
  }
  private set appId(value: string) {
    this.setProperty<string>('appId', value);
  }

  /**
   * The OneSignal ID driving the session. This ID *may* be locally generated
   * and can be checked via IDManager.isLocalId to ensure correct processing.
   */
  get onesignalId(): string {
    return this.getProperty<string>('onesignalId');
  }
  private set onesignalId(value: string) {
    this.setProperty<string>('onesignalId', value);
  }

  /**
   * The amount of active time for the session, in milliseconds.
   */
  get sessionTime(): number {
    return this.getProperty<number>('sessionTime');
  }
  private set sessionTime(value: number) {
    this.setProperty<number>('sessionTime', value);
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
