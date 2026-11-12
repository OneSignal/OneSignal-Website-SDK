import { createSession, type SessionsApiResult, updateSession } from 'src/shared/api/sessions';
import { db } from 'src/shared/database/client';
import Log from 'src/shared/libraries/Log';
import { IDManager } from 'src/shared/managers/IDManager';

import {
  dropExpiredSessionRequests,
  dropRequest,
  getQueuedSessionRequests,
  MAX_SESSION_REQUEST_AGE_MS,
  withQueueLock,
} from './queue';
import type {
  CreateSessionRequestRecord,
  SessionRequestRecord,
  SessionRequestState,
  UpdateSessionRequestRecord,
} from './types';

/** Gives the backend time to process a create (answered with 202) before its first update. */
export const POST_CREATE_DELAY_MS = 5_000;
export const MISSING_RETRY_WINDOW_MS = 60_000;
export const BASE_BACKOFF_MS = 5_000;
export const MAX_BACKOFF_MS = 5 * 60_000;
export const DEFAULT_TOO_MANY_REQUESTS_DELAY_MS = 60_000;
export const MAX_RETRY_AFTER_MS = 60 * 60_000;
/** A create answered without a session ID is dropped after this many tries, like Android and iOS. */
export const MAX_MISSING_SESSION_ID_ATTEMPTS = 3;

/** An update comes with the state of its create, which has succeeded. */
type ReadyRequest =
  | { record: CreateSessionRequestRecord; state?: undefined }
  | { record: UpdateSessionRequestRecord; state: SessionRequestState };

/**
 * Sends queued session requests oldest first until none are ready. A request
 * stays stored until the server accepts it or rejects it for good, so a worker
 * killed mid-send replays it on the next drain with the same idempotency key.
 */
export function drainSessionRequests(): Promise<void> {
  // A separate lock from the queue's, which a drain takes for each step.
  return navigator.locks
    .request('onesignal-session-drain', drainOnce)
    .catch((e) => Log._debug('Sessions API drain:', e));
}

/**
 * A request that is not ready yet waits for the next drain: the worker usually
 * stops within seconds of going idle, so a timer would rarely fire.
 */
async function drainOnce(): Promise<void> {
  await withQueueLock(async () => {
    await dropExpiredSessionRequests();
    for (const state of await db.getAll('SessionRequestStates')) {
      if (Date.now() - state.createdAt > MAX_SESSION_REQUEST_AGE_MS) {
        await db.delete('SessionRequestStates', state.sessionId);
      }
    }
  });

  for (;;) {
    const ready = await withQueueLock(() => pickNext(Date.now()));
    if (!ready) return;

    const result = await send(ready);
    await withQueueLock(() => applyResult(ready, result, Date.now()));
  }
}

/**
 * Only the oldest request of each session can be sent, so a session goes
 * create, then updates, then end. A session that is waiting does not hold up
 * the others.
 */
async function pickNext(now: number): Promise<ReadyRequest | undefined> {
  const seen = new Set<string>();

  for (const record of await getQueuedSessionRequests()) {
    if (seen.has(record.sessionId)) continue;
    seen.add(record.sessionId);

    if (record.kind === 'create') {
      if (IDManager._isLocalId(record.onesignalId) || IDManager._isLocalId(record.subscriptionId)) {
        // Queued records are never rewritten, so a local ID would never become real.
        Log._warn('Sessions API: dropping create with a local id');
        await dropRequest(record);
      } else if (record.notBefore <= now) {
        return { record };
      }
      continue;
    }

    // An update is first in its session only once its create has left the queue.
    const state = await db.get('SessionRequestStates', record.sessionId);
    if (!state) {
      Log._debug('Sessions API: dropping update with no create and no server session id');
      await db.delete('SessionRequests', record.id);
    } else if (Math.max(record.notBefore, state.createdAt + POST_CREATE_DELAY_MS) <= now) {
      return { record, state };
    }
  }
  return undefined;
}

function send({ record, state }: ReadyRequest): Promise<SessionsApiResult<string | void>> {
  const { appId, onesignalId, subscriptionId, idempotencyKey } = record;
  if (!state) {
    return createSession(appId, {
      onesignalId,
      subscriptionId,
      idempotencyKey,
      subscriptionType: record.subscriptionType,
      startTime: record.startTime,
      directAttributionId: record.directAttributionId,
    });
  }
  return updateSession(appId, state.serverSessionId, {
    onesignalId,
    subscriptionId,
    idempotencyKey,
    durationSeconds: record.durationSeconds,
    endTime: record.endTime,
  });
}

async function applyResult(
  { record, state }: ReadyRequest,
  result: SessionsApiResult<string | void>,
  now: number,
): Promise<void> {
  // Replaced by a newer update or dropped by the cap while it was sent.
  if (!(await db.get('SessionRequests', record.id))) return;

  if (result.kind === 'success') {
    // The state is written before the create is deleted, so a worker stopped
    // in between leaves the updates with a server ID.
    if (record.kind === 'create' && typeof result.value === 'string') {
      await db.put('SessionRequestStates', {
        sessionId: record.sessionId,
        serverSessionId: result.value,
        createdAt: now,
      });
    }
    await db.delete('SessionRequests', record.id);
    await forgetEndedSession(record);
    return;
  }

  // May be replication lag right after the create, so it is retried.
  const missingAfterCreate =
    result.status === 404 && !!state && now - state.createdAt < MISSING_RETRY_WINDOW_MS;
  if (result.kind === 'drop' && !missingAfterCreate) {
    Log._warn(`Sessions API: dropping ${record.kind} request, status ${result.status}`);
    await dropRequest(record);
    await forgetEndedSession(record);
    return;
  }

  // A success status on a retry means the create came back without a session ID.
  if (record.kind === 'create' && result.status && result.status < 300) {
    const missingSessionIdAttempts = (record.missingSessionIdAttempts ?? 0) + 1;
    if (missingSessionIdAttempts >= MAX_MISSING_SESSION_ID_ATTEMPTS) {
      Log._warn('Sessions API: dropping create that keeps returning no session id');
      await dropRequest(record);
      return;
    }
    record = { ...record, missingSessionIdAttempts };
  }

  await db.put('SessionRequests', {
    ...record,
    attempts: record.attempts + 1,
    notBefore: now + retryDelayMs(record.attempts, result),
  });
}

/** Retry-After is a floor on the backoff, never a way to skip it. */
function retryDelayMs(
  attempts: number,
  result: Exclude<SessionsApiResult, { kind: 'success' }>,
): number {
  let retryAfterMs = 0;
  if (result.kind === 'retry' && result.retryAfterSeconds !== undefined) {
    retryAfterMs = Math.min(result.retryAfterSeconds * 1000, MAX_RETRY_AFTER_MS);
  } else if (result.status === 429) {
    retryAfterMs = DEFAULT_TOO_MANY_REQUESTS_DELAY_MS;
  }
  return Math.max(backoffMs(attempts), retryAfterMs);
}

/** Nothing is enqueued for a session after its end, so its state is no longer needed. */
async function forgetEndedSession(record: SessionRequestRecord): Promise<void> {
  if (record.kind === 'update' && record.endTime !== undefined) {
    await db.delete('SessionRequestStates', record.sessionId);
  }
}

function backoffMs(attempts: number): number {
  const ceiling = Math.min(BASE_BACKOFF_MS * 2 ** attempts, MAX_BACKOFF_MS);
  return Math.round(ceiling * (0.5 + Math.random() / 2));
}
