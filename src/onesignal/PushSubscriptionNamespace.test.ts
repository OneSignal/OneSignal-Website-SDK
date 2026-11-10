import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { db, getDb, getIdsValue, isReadwriteWedged } from 'src/shared/database/client';
import { getSubscription } from 'src/shared/database/subscription';
import { AppIDMissingError } from 'src/shared/errors/common';
import { NotificationType } from 'src/shared/subscriptions/constants';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test';

vi.mock('src/shared/libraries/Log');

const tripCircuitBreaker = async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  const _db = await getDb();
  vi.spyOn(_db, 'put').mockImplementation(() => new Promise(() => {}));

  const stalledWrite = db.put('Options', { key: 'pageTitle', value: 'title' });
  await vi.advanceTimersByTimeAsync(2000);
  await stalledWrite;
  vi.useRealTimers();
};

describe('PushSubscriptionNamespace', () => {
  beforeEach(() => {
    localStorage.clear();
    TestEnvironment.initialize({ initUserAndPushSubscription: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('optOut uses the configured app ID when IndexedDB returns no app ID', async () => {
    expect(await getIdsValue('appId')).toBeNull();

    await OneSignal.User.PushSubscription.optOut();

    expect((await getSubscription()).optedOut).toBe(true);
  });

  test('optOut throws when no app ID is configured', async () => {
    OneSignal.config!.appId = '';

    await expect(OneSignal.User.PushSubscription.optOut()).rejects.toBe(AppIDMissingError);
  });

  // Keep last: the circuit breaker stays tripped for the rest of the file.
  test('optOut is kept across page loads after the IndexedDB circuit breaker trips', async () => {
    await tripCircuitBreaker();
    expect(isReadwriteWedged()).toBe(true);

    await OneSignal.User.PushSubscription.optOut();

    TestEnvironment.initialize({ initUserAndPushSubscription: true });
    expect((await getSubscription()).optedOut).toBe(true);
    expect(await OneSignal._context._subscriptionManager._getNotificationTypes()).toBe(
      NotificationType._UserOptedOut,
    );
  });
});
