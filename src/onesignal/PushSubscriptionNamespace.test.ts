import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { getIdsValue } from 'src/shared/database/client';
import { getSubscription } from 'src/shared/database/subscription';
import { AppIDMissingError } from 'src/shared/errors/common';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';

vi.mock('src/shared/libraries/Log');

describe('PushSubscriptionNamespace', () => {
  beforeEach(() => {
    TestEnvironment.initialize({ initUserAndPushSubscription: true });
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
});
