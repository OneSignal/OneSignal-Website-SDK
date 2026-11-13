import { ONESIGNAL_SESSION_KEY, SessionStatus } from './constants';
import type { Session } from './types';

type NewSessionOptions = Pick<Session, 'appId'> &
  Partial<
    Pick<
      Session,
      'notificationId' | 'sessionId' | 'usesSessionsApi' | 'onesignalId' | 'subscriptionId'
    >
  >;

export function initializeNewSession(options: NewSessionOptions): Session {
  const currentTimestamp = new Date().getTime();
  const notificationId = (options && options.notificationId) || null;

  return {
    ...options,
    accumulatedDuration: 0,
    lastActivatedTimestamp: currentTimestamp,
    lastDeactivatedTimestamp: null,
    notificationId,
    sessionKey: ONESIGNAL_SESSION_KEY,
    startTimestamp: currentTimestamp,
    status: SessionStatus._Active,
  };
}
