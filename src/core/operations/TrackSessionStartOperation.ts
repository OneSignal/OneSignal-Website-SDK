import { OPERATION_NAME } from '../executors/constants';
import { Operation } from './Operation';

/**
 * An Operation to track the starting of a session, related to a specific user.
 */
export class TrackSessionStartOperation extends Operation {
  constructor();
  constructor(appId: string, onesignalId: string);
  constructor(appId?: string, onesignalId?: string) {
    super(OPERATION_NAME.TRACK_SESSION_START, appId, onesignalId);
  }

  override get modifyComparisonKey(): string {
    return `${this.appId}.User.${this.onesignalId}`;
  }
}
