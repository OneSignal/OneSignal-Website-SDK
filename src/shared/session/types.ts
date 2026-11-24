import type { OutcomesConfig } from '../outcomes/types';
import type { SubscriptionTypeValue } from '../subscriptions/types';
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
  /**
   * The external id of the user whose on_session request was skipped for a
   * missing token, got a 401, or did not reach the server. The next upsert for
   * the same user that brings a token sends it once.
   */
  onSessionPendingFor?: string;
  /** Unset until the sessions API creates this session. */
  serverSessionId?: string;
  /**
   * The fields below are set when a session starts. A session stored by an
   * older SDK lacks them and stays on the legacy path until it ends.
   */
  sessionId?: string;
  /**
   * Whether this session reports through the sessions API. Taken from the
   * feature flag once at start, so a session never mixes paths.
   */
  usesSessionsApi?: boolean;
  /**
   * The user and push subscription the session started with; kept after a login.
   * Local IDs are replaced by the first upsert that brings server IDs, which
   * can be a user who logged in after the session started.
   */
  onesignalId?: string;
  subscriptionId?: string;
  /** The external ID of the user the session started with. Unset for an anonymous user. */
  externalId?: string;
  /**
   * An anonymous session's create is not queued until the first background, a
   * heartbeat, or the session end. A create also waits while the IDs are local.
   */
  isCreateHeld?: boolean;
  /** The duration of the last checkpoint or heartbeat queued for this session. */
  checkpointedDuration?: number;
}

interface BaseSessionPayload {
  sessionThreshold: number;
  enableSessionDuration: boolean;
  sessionOrigin: SessionOriginValue;
  isSafari: boolean;
  outcomesConfig: OutcomesConfig;
  /** Seconds between heartbeats. Unset when sent by an older page SDK. */
  heartbeatInterval?: number;
}

/**
 * Names the user a worker request is for. The page adds externalId when the user
 * has one. The worker has no config and no token store, so the page sets
 * jwtRequired when Identity Verification is on and adds jwt when it has one.
 * Without both, the worker skips only the network request and still updates the
 * local session state.
 */
export interface SessionUser {
  appId: string;
  onesignalId: string;
  subscriptionId: string;
  /** Unset when sent by an older page SDK. */
  subscriptionType?: SubscriptionTypeValue;
  jwtRequired?: boolean;
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
