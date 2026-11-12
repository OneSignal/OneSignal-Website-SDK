import { APP_ID, ONESIGNAL_ID, SUB_ID } from '__test__/constants';
import { createSession, updateSession } from 'src/shared/api/sessions';
import { db } from 'src/shared/database/client';
import { SubscriptionType } from 'src/shared/subscriptions/constants';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test';

import {
  enqueueSessionCreate,
  enqueueSessionUpdate,
  getQueuedSessionRequests,
  MAX_SESSION_REQUEST_AGE_MS,
} from './queue';
import {
  BASE_BACKOFF_MS,
  DEFAULT_TOO_MANY_REQUESTS_DELAY_MS,
  drainSessionRequests,
  MAX_MISSING_SESSION_ID_ATTEMPTS,
  MAX_RETRY_AFTER_MS,
  MISSING_RETRY_WINDOW_MS,
  POST_CREATE_DELAY_MS,
} from './sender';

vi.mock('src/shared/libraries/Log');
vi.mock('src/shared/api/sessions');

const SERVER_SESSION_ID = 'server-session-1';
const NOW = 1_700_000_000_000;
const ids = { appId: APP_ID, onesignalId: ONESIGNAL_ID, subscriptionId: SUB_ID };

const create = (sessionId = 'session-1', extra: Partial<typeof ids> = {}) =>
  enqueueSessionCreate({
    ...ids,
    ...extra,
    sessionId,
    subscriptionType: SubscriptionType._ChromePush,
    startTime: 1000,
  });

const update = (durationSeconds: number, endTime?: number) =>
  enqueueSessionUpdate({ ...ids, sessionId: 'session-1', durationSeconds, endTime });

const queuedKinds = async () => (await getQueuedSessionRequests()).map((r) => r.kind);

const advance = (ms: number) => vi.setSystemTime(Date.now() + ms);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  vi.mocked(createSession).mockResolvedValue({ kind: 'success', value: SERVER_SESSION_ID });
  vi.mocked(updateSession).mockResolvedValue({ kind: 'success', value: undefined });
});

afterEach(() => {
  vi.useRealTimers();
});

test('sends the create, then its updates after the post-create delay', async () => {
  await create();
  await update(10);

  await drainSessionRequests();
  expect(createSession).toHaveBeenCalledWith(APP_ID, {
    onesignalId: ONESIGNAL_ID,
    subscriptionId: SUB_ID,
    idempotencyKey: expect.any(String),
    subscriptionType: SubscriptionType._ChromePush,
    startTime: 1000,
    directAttributionId: undefined,
  });
  expect(updateSession).not.toHaveBeenCalled();
  expect(await db.get('SessionRequestStates', 'session-1')).toEqual({
    sessionId: 'session-1',
    serverSessionId: SERVER_SESSION_ID,
    createdAt: NOW,
  });
  const [waiting] = await getQueuedSessionRequests();

  advance(POST_CREATE_DELAY_MS - 1);
  await drainSessionRequests();
  expect(updateSession).not.toHaveBeenCalled();

  advance(1);
  await drainSessionRequests();
  expect(updateSession).toHaveBeenCalledWith(APP_ID, SERVER_SESSION_ID, {
    onesignalId: ONESIGNAL_ID,
    subscriptionId: SUB_ID,
    idempotencyKey: waiting.idempotencyKey,
    durationSeconds: 10,
    endTime: undefined,
  });
  expect(await queuedKinds()).toEqual([]);
});

test('drops a create with a local id and its updates, and sends other sessions', async () => {
  await create('session-1', { subscriptionId: 'local-123' });
  await update(10);
  await create('session-2');

  await drainSessionRequests();

  expect(createSession).toHaveBeenCalledTimes(1);
  expect(vi.mocked(createSession).mock.calls[0][1].subscriptionId).toBe(SUB_ID);
  expect(updateSession).not.toHaveBeenCalled();
  expect(await queuedKinds()).toEqual([]);
});

test('drops an update with no create and no server session id', async () => {
  await update(10);

  await drainSessionRequests();

  expect(updateSession).not.toHaveBeenCalled();
  expect(await queuedKinds()).toEqual([]);
});

describe('retry', () => {
  test('keeps the request and its key, waiting for Retry-After', async () => {
    vi.mocked(createSession).mockResolvedValueOnce({
      kind: 'retry',
      status: 429,
      retryAfterSeconds: 120,
    });
    await create();
    const [before] = await getQueuedSessionRequests();

    await drainSessionRequests();
    expect(await getQueuedSessionRequests()).toEqual([
      { ...before, attempts: 1, notBefore: NOW + 120_000 },
    ]);

    advance(120_000 - 1);
    await drainSessionRequests();
    expect(createSession).toHaveBeenCalledTimes(1);

    advance(1);
    await drainSessionRequests();
    expect(createSession).toHaveBeenCalledTimes(2);
    expect(vi.mocked(createSession).mock.calls[1][1].idempotencyKey).toBe(before.idempotencyKey);
    expect(await queuedKinds()).toEqual([]);
  });

  test('backs off exponentially with jitter', async () => {
    vi.mocked(createSession).mockResolvedValue({ kind: 'retry' });
    await create();

    const delays: number[] = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      await drainSessionRequests();
      const [record] = await getQueuedSessionRequests();
      delays.push(record.notBefore - Date.now());
      advance(record.notBefore - Date.now());
    }

    delays.forEach((delay, attempt) => {
      const ceiling = BASE_BACKOFF_MS * 2 ** attempt;
      expect(delay).toBeGreaterThanOrEqual(ceiling / 2);
      expect(delay).toBeLessThanOrEqual(ceiling);
    });
  });

  const retryDelay = async (result: Awaited<ReturnType<typeof createSession>>) => {
    vi.mocked(createSession).mockResolvedValueOnce(result);
    await create();
    await drainSessionRequests();
    const [record] = await getQueuedSessionRequests();
    return record.notBefore - NOW;
  };

  test('Retry-After of 0 still backs off', async () => {
    const delay = await retryDelay({ kind: 'retry', status: 503, retryAfterSeconds: 0 });
    expect(delay).toBeGreaterThanOrEqual(BASE_BACKOFF_MS / 2);
    expect(delay).toBeLessThanOrEqual(BASE_BACKOFF_MS);
  });

  test('a 429 without Retry-After waits 60s', async () => {
    expect(await retryDelay({ kind: 'retry', status: 429 })).toBe(
      DEFAULT_TOO_MANY_REQUESTS_DELAY_MS,
    );
  });

  test('Retry-After is capped at an hour', async () => {
    expect(await retryDelay({ kind: 'retry', status: 429, retryAfterSeconds: 86_400 })).toBe(
      MAX_RETRY_AFTER_MS,
    );
  });

  test('a create answered without a session id is dropped after 3 tries', async () => {
    vi.mocked(createSession).mockResolvedValue({ kind: 'retry', status: 202 });
    await create();
    await update(10);

    for (let attempt = 1; attempt < MAX_MISSING_SESSION_ID_ATTEMPTS; attempt++) {
      await drainSessionRequests();
      const [record] = await getQueuedSessionRequests();
      expect(record).toMatchObject({ kind: 'create', missingSessionIdAttempts: attempt });
      advance(record.notBefore - Date.now());
    }
    await drainSessionRequests();

    expect(createSession).toHaveBeenCalledTimes(MAX_MISSING_SESSION_ID_ATTEMPTS);
    expect(await queuedKinds()).toEqual([]);
  });
});

describe('drop', () => {
  test('a dropped create takes its updates with it', async () => {
    vi.mocked(createSession).mockResolvedValue({ kind: 'drop', status: 400 });
    await create();
    await update(10);

    await drainSessionRequests();

    expect(updateSession).not.toHaveBeenCalled();
    expect(await queuedKinds()).toEqual([]);
  });

  test('an update 404 is retried soon after the create, then dropped', async () => {
    vi.mocked(updateSession).mockResolvedValue({ kind: 'drop', status: 404 });
    await create();
    await update(10);
    await drainSessionRequests();

    advance(POST_CREATE_DELAY_MS);
    await drainSessionRequests();
    expect(updateSession).toHaveBeenCalledTimes(1);
    expect(await getQueuedSessionRequests()).toMatchObject([{ kind: 'update', attempts: 1 }]);

    advance(MISSING_RETRY_WINDOW_MS);
    await drainSessionRequests();
    expect(updateSession).toHaveBeenCalledTimes(2);
    expect(await queuedKinds()).toEqual([]);
  });
});

describe('server session id', () => {
  const sentUpdate = async () => {
    advance(POST_CREATE_DELAY_MS);
    await drainSessionRequests();
    expect(updateSession).toHaveBeenCalledTimes(1);
    return vi.mocked(updateSession).mock.calls[0];
  };

  test('reaches updates and ends enqueued after the create was sent', async () => {
    await create();
    await drainSessionRequests();
    await update(10, 2000);

    const [, serverSessionId, body] = await sentUpdate();
    expect(serverSessionId).toBe(SERVER_SESSION_ID);
    expect(body.endTime).toBe(2000);
  });

  test('reaches an end that replaced an update waiting out the post-create delay', async () => {
    await create();
    await update(10);
    await drainSessionRequests();
    await update(20, 2000);

    const [, serverSessionId, body] = await sentUpdate();
    expect(serverSessionId).toBe(SERVER_SESSION_ID);
    expect(body).toMatchObject({ durationSeconds: 20, endTime: 2000 });
  });

  test('state is removed once the end is sent, or past the age limit', async () => {
    await create();
    await drainSessionRequests();
    await db.put('SessionRequestStates', {
      sessionId: 'expired',
      serverSessionId: 'server',
      createdAt: NOW - MAX_SESSION_REQUEST_AGE_MS - 1,
    });
    await update(10, 2000);

    await sentUpdate();

    expect(await db.getAll('SessionRequestStates')).toEqual([]);
  });
});

test('an update replaced while it is sent is not retried, and the newer one is sent', async () => {
  await create();
  await update(10);
  await drainSessionRequests();
  advance(POST_CREATE_DELAY_MS);
  let resolveUpdate!: (value: { kind: 'retry' }) => void;
  vi.mocked(updateSession).mockReturnValueOnce(
    new Promise((resolve) => {
      resolveUpdate = resolve;
    }),
  );
  const draining = drainSessionRequests();
  await vi.waitFor(() => expect(updateSession).toHaveBeenCalledTimes(1));

  await update(20, 2000);
  resolveUpdate({ kind: 'retry' });
  await draining;

  expect(updateSession).toHaveBeenCalledTimes(2);
  expect(vi.mocked(updateSession).mock.calls[1][2]).toMatchObject({
    durationSeconds: 20,
    endTime: 2000,
  });
  expect(await queuedKinds()).toEqual([]);
});

test('an update enqueued while its create is in flight gets the server session id', async () => {
  let resolveCreate!: (value: { kind: 'success'; value: string }) => void;
  vi.mocked(createSession).mockReturnValueOnce(
    new Promise((resolve) => {
      resolveCreate = resolve;
    }),
  );
  await create();
  const draining = drainSessionRequests();
  await vi.waitFor(() => expect(createSession).toHaveBeenCalled());

  await update(10, 2000);
  resolveCreate({ kind: 'success', value: SERVER_SESSION_ID });
  await draining;

  advance(POST_CREATE_DELAY_MS);
  await drainSessionRequests();
  expect(vi.mocked(updateSession).mock.calls[0][1]).toBe(SERVER_SESSION_ID);
});
