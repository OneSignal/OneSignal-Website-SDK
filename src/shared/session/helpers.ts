import { ONESIGNAL_SESSION_KEY, SessionStatus } from './constants';
import type { Session } from './types';

type NewSessionOptions = Partial<Session> & { appId: string };

export function initializeNewSession(options: NewSessionOptions): Session {
  const currentTimestamp = new Date().getTime();
  const notificationId = (options && options.notificationId) || null;

  return {
    accumulatedDuration: 0,
    appId: options.appId,
    lastActivatedTimestamp: currentTimestamp,
    lastDeactivatedTimestamp: null,
    notificationId,
    sessionKey: ONESIGNAL_SESSION_KEY,
    startTimestamp: currentTimestamp,
    status: SessionStatus._Active,
  };
}
