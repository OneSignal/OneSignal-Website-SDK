import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { updateIdentityModel } from '__test__/support/helpers/setup';
import { SubscriptionModel } from 'src/core/models/SubscriptionModel';
import { BaseSubscriptionOperation } from 'src/core/operations/BaseSubscriptionOperation';
import { db } from 'src/shared/database/client';
import Log from 'src/shared/libraries/Log';
import { describe, test, expect, beforeEach, vi } from 'vite-plus/test';

import LoginManager from './LoginManager';

describe('LoginManager', () => {
  beforeEach(() => {
    TestEnvironment.initialize();
  });

  test('login: skips when externalId unchanged and logs debug', async () => {
    const debugSpy = vi.spyOn(Log, '_debug').mockImplementation(() => undefined);
    updateIdentityModel('external_id', 'same-id');

    await LoginManager.login('same-id');
    expect(debugSpy).toHaveBeenCalledWith('Login: externalId already set');
  });

  test('login: stores token when provided and enqueues operations', async () => {
    const dbSpy = vi.spyOn(db, 'put');
    // mock push subscription exists so transfer op enqueues
    const createPushSub = () => ({
      id: 'push-sub-id',
    });
    vi.spyOn(OneSignal._coreDirector, '_getPushSubscriptionModel').mockResolvedValue(
      createPushSub() as SubscriptionModel,
    );
    const enqueueSpy = vi.spyOn(OneSignal._coreDirector._operationRepo, '_enqueue');
    const enqueueAndWaitSpy = vi
      .spyOn(OneSignal._coreDirector._operationRepo, '_enqueueAndWait')
      .mockResolvedValue(undefined);

    await LoginManager.login('new-external-id', 'jwt-token-123');
    expect(dbSpy).toHaveBeenCalledWith('Ids', {
      id: 'jwt-token-123',
      type: 'jwtToken',
    });
    expect(enqueueSpy).toHaveBeenCalled();
    expect(enqueueAndWaitSpy).toHaveBeenCalled();
  });

  test('login: with existing push sub enqueues transfer operation', async () => {
    const mockPushSub = { id: 'push-sub-id' } as SubscriptionModel;
    vi.spyOn(OneSignal._coreDirector, '_getPushSubscriptionModel').mockResolvedValue(mockPushSub);
    const enqueueSpy = vi.spyOn(OneSignal._coreDirector._operationRepo, '_enqueue');
    vi.spyOn(OneSignal._coreDirector._operationRepo, '_enqueueAndWait').mockResolvedValue(
      undefined,
    );

    await LoginManager.login('new-id');

    expect(enqueueSpy).toHaveBeenCalled();
    const transferOp = enqueueSpy.mock.calls[0][0] as BaseSubscriptionOperation;
    expect(transferOp._subscriptionId).toBe('push-sub-id');
  });

  test('login: without push sub creates new subscription model', async () => {
    vi.spyOn(OneSignal._coreDirector, '_getPushSubscriptionModel').mockResolvedValue(undefined);
    vi.spyOn(OneSignal._coreDirector._operationRepo, '_enqueueAndWait').mockResolvedValue(
      undefined,
    );
    const addSpy = vi.spyOn(OneSignal._coreDirector._subscriptionModelStore, '_add');

    await LoginManager.login('new-id');

    expect(addSpy).toHaveBeenCalled();
    expect(addSpy.mock.calls[0][0].token).toBe('');
  });

  test('logout: no external id logs debug and returns', async () => {
    const debugSpy = vi.spyOn(Log, '_debug').mockImplementation(() => undefined);
    updateIdentityModel('external_id', undefined);
    await LoginManager.logout();
    expect(debugSpy).toHaveBeenCalledWith('Logout: not logged in');
  });

  test('logout: with external id and push sub enqueues transfer and login operations', async () => {
    updateIdentityModel('external_id', 'abc');
    const mockPushSub = { id: 'sub-id' } as SubscriptionModel;
    vi.spyOn(OneSignal._coreDirector, '_getPushSubscriptionModel').mockResolvedValue(mockPushSub);
    const enqueueSpy = vi.spyOn(OneSignal._coreDirector._operationRepo, '_enqueue');
    vi.spyOn(OneSignal._coreDirector._operationRepo, '_enqueueAndWait').mockResolvedValue(
      undefined,
    );

    await LoginManager.logout();

    expect(enqueueSpy).toHaveBeenCalled();
    const transferOp = enqueueSpy.mock.calls[0][0] as BaseSubscriptionOperation;
    expect(transferOp._subscriptionId).toBe('sub-id');
  });
});
