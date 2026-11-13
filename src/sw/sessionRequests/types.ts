import type { SubscriptionTypeValue } from 'src/shared/subscriptions/types';

interface BaseSessionRequest {
  /** Store key, a random UUID. Not sent to the server. */
  id: string;
  /** Queue position; lower is older. */
  order: number;
  appId: string;
  /** The local session ID that groups a session's requests. */
  sessionId: string;
  onesignalId: string;
  subscriptionId: string;
  /** Created with the request and reused on every retry. */
  idempotencyKey: string;
  /** Epoch milliseconds. */
  enqueuedAt: number;
  /** Failed send attempts so far. */
  attempts: number;
  /** Epoch milliseconds; not sent before this. */
  notBefore: number;
}

export interface CreateSessionRequestRecord extends BaseSessionRequest {
  kind: 'create';
  subscriptionType: SubscriptionTypeValue;
  /** Epoch milliseconds. */
  startTime: number;
  directAttributionId?: string;
  /** Successful responses that had no session ID. */
  missingSessionIdAttempts?: number;
}

export interface UpdateSessionRequestRecord extends BaseSessionRequest {
  kind: 'update';
  durationSeconds: number;
  /** Epoch milliseconds. Set to end the session. */
  endTime?: number;
}

export type SessionRequestRecord = CreateSessionRequestRecord | UpdateSessionRequestRecord;

/**
 * Written when a session's create succeeds. It outlives the create record, so
 * updates enqueued later, or after a worker restart, still find the server ID.
 */
export interface SessionRequestState {
  /** The local session ID. */
  sessionId: string;
  serverSessionId: string;
  /** Epoch milliseconds when the create succeeded. */
  createdAt: number;
}
