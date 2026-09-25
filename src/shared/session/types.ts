import type { OutcomesConfig } from '../outcomes/types';
import type { SessionOrigin, SessionStatus } from './constants';

export type SessionStatusValue = (typeof SessionStatus)[keyof typeof SessionStatus];

export type SessionOriginValue = (typeof SessionOrigin)[keyof typeof SessionOrigin];

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

interface BaseSessionPayload {
  sessionThreshold: number;
  enableSessionDuration: boolean;
  sessionOrigin: SessionOriginValue;
  isSafari: boolean;
  outcomesConfig: OutcomesConfig;
}

/**
 * Names the user a worker request is for. The worker has no config and no token
 * store, so the page adds externalId and jwt when Identity Verification is on.
 */
export interface SessionUser {
  appId: string;
  onesignalId: string;
  subscriptionId: string;
  externalId?: string;
  jwt?: string;
}

export interface UpsertOrDeactivateSessionPayload extends BaseSessionPayload, SessionUser {}

export interface PageVisibilityRequest {
  timestamp: number;
}

export interface PageVisibilityResponse extends PageVisibilityRequest {
  focused: boolean;
}
