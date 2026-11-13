import { APP_ID, ONESIGNAL_ID, SUB_ID } from '__test__/constants';
import { createFakeLocks } from '__test__/support/helpers/locks';
import { createSession } from 'src/shared/api/sessions';
import { SubscriptionType } from 'src/shared/subscriptions/constants';
import { expect, test, vi } from 'vite-plus/test';

import { enqueueSessionCreate, getQueuedSessionRequests } from './queue';
import { drainSessionRequests } from './sender';

vi.mock('src/shared/libraries/Log');
vi.mock('src/shared/api/sessions');

// Kept in its own file: the first worker's drain never settles.
test('a worker stopped mid-send replays the request with the same key', async () => {
  vi.mocked(createSession).mockReturnValueOnce(new Promise(() => {}));
  await enqueueSessionCreate({
    appId: APP_ID,
    onesignalId: ONESIGNAL_ID,
    subscriptionId: SUB_ID,
    sessionId: 'session-1',
    subscriptionType: SubscriptionType._ChromePush,
    startTime: 1000,
  });
  const [before] = await getQueuedSessionRequests();
  void drainSessionRequests();
  await vi.waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
  expect(await getQueuedSessionRequests()).toEqual([before]);

  // A new worker starts with fresh module state and locks, and the same database.
  vi.resetModules();
  Object.defineProperty(navigator, 'locks', { value: createFakeLocks(), configurable: true });
  const sender = await import('./sender');
  const api = await import('src/shared/api/sessions');
  vi.mocked(api.createSession).mockResolvedValue({ kind: 'success', value: 'server-session-1' });
  await sender.drainSessionRequests();

  expect(vi.mocked(api.createSession).mock.calls[0][1].idempotencyKey).toBe(before.idempotencyKey);
  expect(await getQueuedSessionRequests()).toEqual([]);
});
