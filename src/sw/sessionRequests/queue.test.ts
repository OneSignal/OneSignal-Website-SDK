import { APP_ID, ONESIGNAL_ID, SUB_ID } from '__test__/constants';
import { db } from 'src/shared/database/client';
import { SubscriptionType } from 'src/shared/subscriptions/constants';
import { describe, expect, test, vi } from 'vite-plus/test';

import {
  dropExpiredSessionRequests,
  enqueueSessionCreate,
  enqueueSessionUpdate,
  getQueuedSessionRequests,
  MAX_QUEUED_SESSION_REQUESTS,
  MAX_SESSION_REQUEST_AGE_MS,
} from './queue';
import type { UpdateSessionRequestRecord } from './types';

vi.mock('src/shared/libraries/Log');

const ids = { appId: APP_ID, onesignalId: ONESIGNAL_ID, subscriptionId: SUB_ID };

const create = (sessionId = 'session-1') =>
  enqueueSessionCreate({
    ...ids,
    sessionId,
    subscriptionType: SubscriptionType._ChromePush,
    startTime: 1000,
  });

const update = (durationSeconds: number, extra: { endTime?: number; sessionId?: string } = {}) =>
  enqueueSessionUpdate({ ...ids, sessionId: 'session-1', durationSeconds, ...extra });

const summary = async () =>
  (await getQueuedSessionRequests()).map((r) =>
    r.kind === 'create'
      ? `${r.sessionId}:create`
      : `${r.sessionId}:${r.endTime === undefined ? 'update' : 'end'}:${r.durationSeconds}`,
  );

const updates = async () =>
  (await getQueuedSessionRequests()).filter(
    (r): r is UpdateSessionRequestRecord => r.kind === 'update',
  );

describe('enqueue', () => {
  test('keeps requests in enqueue order with fresh ids and keys', async () => {
    await create();
    await update(10);
    await create('session-2');

    expect(await summary()).toEqual([
      'session-1:create',
      'session-1:update:10',
      'session-2:create',
    ]);
    const queued = await getQueuedSessionRequests();
    expect(queued.map((r) => r.order)).toEqual([1, 2, 3]);
    expect(new Set(queued.map((r) => r.idempotencyKey)).size).toBe(3);
    expect(queued[0]).toMatchObject({ ...ids, attempts: 0, notBefore: 0, startTime: 1000 });
  });

  test('coalesces updates to the highest duration with a new key', async () => {
    await create();
    await update(10);
    const [first] = await updates();
    await update(30);
    await update(20);

    expect(await summary()).toEqual(['session-1:create', 'session-1:update:30']);
    const [coalesced] = await updates();
    expect(coalesced.id).not.toBe(first.id);
    expect(coalesced.idempotencyKey).not.toBe(first.idempotencyKey);
  });

  test('an end replaces queued updates', async () => {
    await create();
    await update(10);
    await update(40, { endTime: 5000 });

    expect(await summary()).toEqual(['session-1:create', 'session-1:end:40']);
    expect((await updates())[0].endTime).toBe(5000);
  });

  test('drops updates and ends queued after an end', async () => {
    await update(40, { endTime: 5000 });
    await update(50);
    await update(60, { endTime: 6000 });

    expect(await summary()).toEqual(['session-1:end:40']);
  });

  test('coalescing is per session', async () => {
    await update(10);
    await update(20, { sessionId: 'session-2' });
    await update(30, { endTime: 3000, sessionId: 'session-2' });

    expect(await summary()).toEqual(['session-1:update:10', 'session-2:end:30']);
  });
});

describe('cap', () => {
  test('drops the oldest request over the cap', async () => {
    for (let i = 0; i < MAX_QUEUED_SESSION_REQUESTS; i++) {
      await update(i, { sessionId: `session-${i}` });
    }
    await update(999, { sessionId: 'session-new' });

    const queued = await summary();
    expect(queued).toHaveLength(MAX_QUEUED_SESSION_REQUESTS);
    expect(queued[0]).toBe('session-1:update:1');
    expect(queued.at(-1)).toBe('session-new:update:999');
  });

  test('a dropped create takes its updates with it', async () => {
    await create('session-0');
    await update(5, { sessionId: 'session-0' });
    for (let i = 1; i < MAX_QUEUED_SESSION_REQUESTS - 1; i++) {
      await update(i, { sessionId: `session-${i}` });
    }
    await update(999, { sessionId: 'session-new' });

    const queued = await summary();
    expect(queued).toHaveLength(MAX_QUEUED_SESSION_REQUESTS - 1);
    expect(queued.some((r) => r.startsWith('session-0:'))).toBe(false);
  });
});

describe('age limit', () => {
  test('drops requests older than the limit and the updates of a dropped create', async () => {
    await create('old');
    await update(10, { sessionId: 'old' });
    await create('new');
    const [oldCreate, oldUpdate] = await getQueuedSessionRequests();
    const now = Date.now();
    await db.put('SessionRequests', {
      ...oldCreate,
      enqueuedAt: now - MAX_SESSION_REQUEST_AGE_MS - 1,
    });
    await db.put('SessionRequests', { ...oldUpdate, enqueuedAt: now });

    await dropExpiredSessionRequests(now);

    expect(await summary()).toEqual(['new:create']);
  });
});
