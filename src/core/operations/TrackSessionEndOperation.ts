import { OPERATION_NAME } from '../constants';

import { Operation } from './Operation';

type TrackEndOp = {
  sessionTime: number;
};

/**
 * An Operation to track the ending of a session, related to a specific user.
 */
export class TrackSessionEndOperation extends Operation<TrackEndOp> {
  constructor();
  constructor(appId: string, onesignalId: string, sessionTime: number);
  constructor(appId?: string, onesignalId?: string, sessionTime?: number) {
    super(OPERATION_NAME.TRACK_SESSION_END, appId, onesignalId);
    if (sessionTime) this.sessionTime = sessionTime;
  }

  /**
   * The amount of active time for the session, in milliseconds.
   */
  get sessionTime(): number {
    return this.getProperty('sessionTime');
  }
  private set sessionTime(value: number) {
    this.setProperty('sessionTime', value);
  }

  override get modifyComparisonKey(): string {
    return `${this.appId}.User.${this.onesignalId}`;
  }
}
