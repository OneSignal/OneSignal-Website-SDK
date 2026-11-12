import { db } from 'src/shared/database/client';
import Log from 'src/shared/libraries/Log';

import type {
  CreateSessionRequestRecord,
  SessionRequestRecord,
  UpdateSessionRequestRecord,
} from './types';

export const MAX_QUEUED_SESSION_REQUESTS = 100;
export const MAX_SESSION_REQUEST_AGE_MS = 30 * 24 * 60 * 60 * 1000;

type QueuedFields =
  | 'id'
  | 'order'
  | 'kind'
  | 'idempotencyKey'
  | 'enqueuedAt'
  | 'attempts'
  | 'notBefore';
export type NewCreateSessionRequest = Omit<CreateSessionRequestRecord, QueuedFields>;
export type NewUpdateSessionRequest = Omit<UpdateSessionRequestRecord, QueuedFields>;

/**
 * Runs queue reads and writes one at a time, so an enqueue never interleaves
 * with the sender applying a result. The sender re-reads a request after
 * sending it, since an enqueue or the cap may have replaced or dropped it.
 */
export function withQueueLock<T>(fn: () => Promise<T>): Promise<T> {
  return navigator.locks.request('onesignal-session-requests', fn);
}

export async function getQueuedSessionRequests(): Promise<SessionRequestRecord[]> {
  const records = await db.getAll('SessionRequests');
  return records.sort((a, b) => a.order - b.order);
}

export function enqueueSessionCreate(request: NewCreateSessionRequest): Promise<void> {
  return withQueueLock(async () => {
    const queued = await getQueuedSessionRequests();
    await db.put('SessionRequests', { ...newRecordFields(queued), ...request, kind: 'create' });
    await enforceCap();
  });
}

export function enqueueSessionUpdate(request: NewUpdateSessionRequest): Promise<void> {
  return withQueueLock(async () => {
    const queued = await getQueuedSessionRequests();
    const updates = queued.filter(
      (r): r is UpdateSessionRequestRecord =>
        r.kind === 'update' && r.sessionId === request.sessionId,
    );

    if (updates.some((r) => r.endTime !== undefined)) {
      Log._debug('Sessions API: dropping update queued after the session end');
      return;
    }

    // Each update replaces the session's queued ones, so durations coalesce to
    // the highest and an end replaces unsent updates. Written before the
    // replaced ones are deleted, so a worker killed in between still sends one.
    await db.put('SessionRequests', {
      ...newRecordFields(queued),
      ...request,
      kind: 'update',
      durationSeconds: Math.max(request.durationSeconds, ...updates.map((r) => r.durationSeconds)),
    });
    for (const update of updates) {
      await db.delete('SessionRequests', update.id);
    }
    await enforceCap();
  });
}

/** Drops requests older than the age limit. Call with the queue lock held. */
export async function dropExpiredSessionRequests(now = Date.now()): Promise<void> {
  for (const record of await getQueuedSessionRequests()) {
    if (now - record.enqueuedAt <= MAX_SESSION_REQUEST_AGE_MS) continue;
    Log._warn(`Sessions API: dropping ${record.kind} request older than 30 days`);
    await dropRequest(record);
  }
}

/**
 * Drops a request. A dropped create takes its session's updates with it, since
 * they can never get a server session ID.
 */
export async function dropRequest(record: SessionRequestRecord): Promise<void> {
  await db.delete('SessionRequests', record.id);
  if (record.kind !== 'create') return;
  for (const other of await getQueuedSessionRequests()) {
    if (other.sessionId === record.sessionId) {
      await db.delete('SessionRequests', other.id);
    }
  }
}

async function enforceCap(): Promise<void> {
  let queued = await getQueuedSessionRequests();
  while (queued.length > MAX_QUEUED_SESSION_REQUESTS) {
    const [oldest] = queued;
    Log._warn(
      `Sessions API: queue over ${MAX_QUEUED_SESSION_REQUESTS} requests, dropping oldest ${oldest.kind}`,
    );
    await dropRequest(oldest);
    queued = await getQueuedSessionRequests();
  }
}

function newRecordFields(
  queued: SessionRequestRecord[],
): Pick<
  SessionRequestRecord,
  'id' | 'order' | 'idempotencyKey' | 'enqueuedAt' | 'attempts' | 'notBefore'
> {
  return {
    id: crypto.randomUUID(),
    order: (queued.at(-1)?.order ?? 0) + 1,
    idempotencyKey: crypto.randomUUID(),
    enqueuedAt: Date.now(),
    attempts: 0,
    notBefore: 0,
  };
}
