import { ONESIGNAL_ID } from '__test__/constants';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { updateIdentityModel } from '__test__/support/helpers/setup';
import { SubscriptionModel } from 'src/core/models/SubscriptionModel';
import { BaseSubscriptionOperation } from 'src/core/operations/BaseSubscriptionOperation';
import type { LoginUserOperation } from 'src/core/operations/LoginUserOperation';
import { JwtRequirement } from 'src/shared/config/jwtRequirement';
import { setJwtRequirement } from 'src/shared/helpers/localStorage';
import Log from 'src/shared/libraries/Log';
import { describe, test, expect, beforeEach, vi } from 'vite-plus/test';

import LoginManager from './LoginManager';

describe('LoginManager', () => {
  beforeEach(() => {
    localStorage.clear();
    TestEnvironment.initialize();
  });

  test('login: skips when externalId unchanged and logs debug', async () => {
    const debugSpy = vi.spyOn(Log, '_debug').mockImplementation(() => undefined);
    updateIdentityModel('external_id', 'same-id');

    await LoginManager.login('same-id');
    expect(debugSpy).toHaveBeenCalledWith('Login: externalId already set');
  });

  test('login: stores token when provided and enqueues operations', async () => {
    const putJwtSpy = vi.spyOn(OneSignal._coreDirector._jwtTokenStore, '_putJwt');
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
    expect(putJwtSpy).toHaveBeenCalledExactlyOnceWith('new-external-id', 'jwt-token-123');
    expect(OneSignal._coreDirector._jwtTokenStore._getJwt('new-external-id')).toBe('jwt-token-123');
    expect(enqueueSpy).toHaveBeenCalled();
    expect(enqueueAndWaitSpy).toHaveBeenCalled();
  });

  test('login: same externalId with a new token stores the token before it returns', async () => {
    updateIdentityModel('external_id', 'same-id');

    await LoginManager.login('same-id', 'fresh-token');

    expect(OneSignal._coreDirector._jwtTokenStore._getJwt('same-id')).toBe('fresh-token');
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

  describe('login: existingOnesignalId on the LoginUserOperation', () => {
    const loginAndGetOp = async () => {
      vi.spyOn(OneSignal._coreDirector, '_getPushSubscriptionModel').mockResolvedValue(undefined);
      const enqueueAndWaitSpy = vi
        .spyOn(OneSignal._coreDirector._operationRepo, '_enqueueAndWait')
        .mockResolvedValue(undefined);

      await LoginManager.login('new-id');

      return enqueueAndWaitSpy.mock.calls[0][0] as LoginUserOperation;
    };

    test('IV inactive, anonymous user: carries the current onesignal id', async () => {
      setJwtRequirement(JwtRequirement._NotRequired);
      updateIdentityModel('onesignal_id', ONESIGNAL_ID);

      expect((await loginAndGetOp())._existingOnesignalId).toBe(ONESIGNAL_ID);
    });

    test('IV inactive, identified user: carries no onesignal id', async () => {
      setJwtRequirement(JwtRequirement._NotRequired);
      updateIdentityModel('onesignal_id', ONESIGNAL_ID);
      updateIdentityModel('external_id', 'old-id');

      expect((await loginAndGetOp())._existingOnesignalId).toBeUndefined();
    });

    test('IV active, anonymous user: carries no onesignal id', async () => {
      setJwtRequirement(JwtRequirement._Required);
      updateIdentityModel('onesignal_id', ONESIGNAL_ID);

      expect((await loginAndGetOp())._existingOnesignalId).toBeUndefined();
    });
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
