import type { OutcomesConfig } from './Outcomes';

export const SessionStatus = {
  Active: 'active',
  Inactive: 'inactive',
} as const;

export type SessionStatusValue =
  (typeof SessionStatus)[keyof typeof SessionStatus];

export const SessionOrigin = {
  UserCreate: 1,
  UserNewSession: 2,
  VisibilityVisible: 3,
  VisibilityHidden: 4,
  BeforeUnload: 5,
  PageRefresh: 6,
  Focus: 7,
  Blur: 8,
} as const;

export type SessionOriginValue =
  (typeof SessionOrigin)[keyof typeof SessionOrigin];

export interface Session {
  sessionKey: string; // indexDb keyPath, always ONESIGNAL_SESSION_KEY
  appId: string;
  startTimestamp: number;
  accumulatedDuration: number;
  notificationId: string | null; // for direct clicks
  status: SessionStatusValue;
  lastDeactivatedTimestamp: number | null;
  lastActivatedTimestamp: number;
}

type NewSessionOptions = Partial<Session> & { appId: string };

interface BaseSessionPayload {
  sessionThreshold: number;
  enableSessionDuration: boolean;
  sessionOrigin: SessionOriginValue;
  isSafari: boolean;
  outcomesConfig: OutcomesConfig;
}

export interface UpsertOrDeactivateSessionPayload extends BaseSessionPayload {
  appId: string;
  onesignalId: string;
  subscriptionId: string;
}

export interface PageVisibilityRequest {
  timestamp: number;
}

export interface PageVisibilityResponse extends PageVisibilityRequest {
  focused: boolean;
}

export const ONESIGNAL_SESSION_KEY = 'oneSignalSession';

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
    status: SessionStatus.Active,
  };
}
