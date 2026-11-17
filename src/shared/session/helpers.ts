import { ONESIGNAL_SESSION_KEY, SessionOrigin, SessionStatus } from './constants';
import type { Session, SessionOriginValue } from './types';

/** A tab hid or closed, as opposed to the window only losing focus. */
export function isBackgroundOrigin(origin: SessionOriginValue): boolean {
  return origin === SessionOrigin._VisibilityHidden || origin === SessionOrigin._PageHide;
}

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
