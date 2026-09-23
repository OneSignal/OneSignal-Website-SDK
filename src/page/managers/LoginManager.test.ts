import { ONESIGNAL_ID } from '__test__/constants';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { updateIdentityModel } from '__test__/support/helpers/setup';
import { SubscriptionModel } from 'src/core/models/SubscriptionModel';
import { BaseSubscriptionOperation } from 'src/core/operations/BaseSubscriptionOperation';
import { LoginUserOperation } from 'src/core/operations/LoginUserOperation';
import { TransferSubscriptionOperation } from 'src/core/operations/TransferSubscriptionOperation';
import { UpdateSubscriptionOperation } from 'src/core/operations/UpdateSubscriptionOperation';
import { JwtRequirement } from 'src/shared/config/jwtRequirement';
import { FeatureFlag } from 'src/shared/features/featureFlags';
import { setFeatureFlags, setJwtRequirement } from 'src/shared/helpers/localStorage';
import Log from 'src/shared/libraries/Log';
import { IDManager } from 'src/shared/managers/IDManager';
import { NotificationType } from 'src/shared/subscriptions/constants';
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

  describe('login: same externalId', () => {
    const debugSpy = vi.spyOn(Log, '_debug').mockImplementation(() => undefined);

    beforeEach(() => {
      updateIdentityModel('external_id', 'same-id');
    });

    test('with a new token: updates the token and does not switch users', async () => {
      OneSignal._coreDirector._jwtTokenStore._putJwt('same-id', 'old-token');
      const identityModel = OneSignal._coreDirector._getIdentityModel();
      const enqueueSpy = vi.spyOn(OneSignal._coreDirector._operationRepo, '_enqueue');
      const enqueueAndWaitSpy = vi.spyOn(OneSignal._coreDirector._operationRepo, '_enqueueAndWait');

      await LoginManager.login('same-id', 'fresh-token');

      expect(OneSignal._coreDirector._jwtTokenStore._getJwt('same-id')).toBe('fresh-token');
      expect(OneSignal._coreDirector._getIdentityModel()).toBe(identityModel);
      expect(enqueueSpy).not.toHaveBeenCalled();
      expect(enqueueAndWaitSpy).not.toHaveBeenCalled();
      expect(debugSpy).toHaveBeenCalledWith('Login: externalId already set, JWT updated');
    });

    test('with no token: does nothing', async () => {
      const identityModel = OneSignal._coreDirector._getIdentityModel();
      const enqueueSpy = vi.spyOn(OneSignal._coreDirector._operationRepo, '_enqueue');
      const enqueueAndWaitSpy = vi.spyOn(OneSignal._coreDirector._operationRepo, '_enqueueAndWait');

      await LoginManager.login('same-id');

      expect(OneSignal._coreDirector._jwtTokenStore._getJwt('same-id')).toBeUndefined();
      expect(OneSignal._coreDirector._getIdentityModel()).toBe(identityModel);
      expect(enqueueSpy).not.toHaveBeenCalled();
      expect(enqueueAndWaitSpy).not.toHaveBeenCalled();
      expect(debugSpy).toHaveBeenCalledWith('Login: externalId already set');
    });
  });

  test('login: different externalId stores the token before the login operation is enqueued', async () => {
    updateIdentityModel('external_id', 'old-id');
    vi.spyOn(OneSignal._coreDirector, '_getPushSubscriptionModel').mockResolvedValue(undefined);
    let tokenAtEnqueue: string | undefined;
    vi.spyOn(OneSignal._coreDirector._operationRepo, '_enqueueAndWait').mockImplementation((op) => {
      tokenAtEnqueue = OneSignal._coreDirector._jwtTokenStore._getJwt(op._externalId ?? '');
      return Promise.resolve();
    });

    await LoginManager.login('new-id', 'new-token');

    expect(tokenAtEnqueue).toBe('new-token');
    expect(OneSignal._coreDirector._getIdentityModel()._externalId).toBe('new-id');
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

  describe('logout under Identity Verification', () => {
    const externalId = 'abc';
    const pushSub = {
      id: 'sub-id',
      type: 'ChromePush',
      token: 'push-token',
      web_auth: 'auth',
      web_p256: 'p256',
    } as SubscriptionModel;

    beforeEach(() => {
      setJwtRequirement(JwtRequirement._Required);
      updateIdentityModel('external_id', externalId);
      OneSignal._coreDirector._jwtTokenStore._putJwt(externalId, 'jwt');
    });

    test('disables push on the user that logs out, then switches with no server operation', async () => {
      vi.spyOn(OneSignal._coreDirector, '_getPushSubscriptionModel').mockResolvedValue(pushSub);
      const enqueueSpy = vi.spyOn(OneSignal._coreDirector._operationRepo, '_enqueue');
      const enqueueAndWaitSpy = vi.spyOn(OneSignal._coreDirector._operationRepo, '_enqueueAndWait');

      await LoginManager.logout();

      expect(enqueueSpy).toHaveBeenCalledOnce();
      const op = enqueueSpy.mock.calls[0][0] as UpdateSubscriptionOperation;
      expect(op).toBeInstanceOf(UpdateSubscriptionOperation);
      expect(op._onesignalId).toBe(ONESIGNAL_ID);
      expect(op._externalId).toBe(externalId);
      expect(op._subscriptionId).toBe('sub-id');
      expect(op.enabled).toBe(false);
      expect(op.notification_types).toBe(NotificationType._UserOptedOut);
      expect(op.token).toBe('push-token');
      expect(op.type).toBe('ChromePush');
      expect(op.web_auth).toBe('auth');
      expect(op.web_p256).toBe('p256');
      expect(enqueueAndWaitSpy).not.toHaveBeenCalled();

      const identityModel = OneSignal._coreDirector._getIdentityModel();
      expect(identityModel._externalId).toBeUndefined();
      expect(IDManager._isLocalId(identityModel._onesignalId)).toBe(true);
      expect(OneSignal._coreDirector._jwtTokenStore._getJwt(externalId)).toBe('jwt');
    });

    test('with no push subscription: switches with no operation at all', async () => {
      vi.spyOn(OneSignal._coreDirector, '_getPushSubscriptionModel').mockResolvedValue(undefined);
      const enqueueSpy = vi.spyOn(OneSignal._coreDirector._operationRepo, '_enqueue');
      const enqueueAndWaitSpy = vi.spyOn(OneSignal._coreDirector._operationRepo, '_enqueueAndWait');

      await LoginManager.logout();

      expect(enqueueSpy).not.toHaveBeenCalled();
      expect(enqueueAndWaitSpy).not.toHaveBeenCalled();
      expect(OneSignal._coreDirector._getIdentityModel()._externalId).toBeUndefined();
    });

    test('with the flag on and the requirement off: keeps the legacy transfer and login', async () => {
      setFeatureFlags([FeatureFlag._IdentityVerification]);
      setJwtRequirement(JwtRequirement._NotRequired);
      vi.spyOn(OneSignal._coreDirector, '_getPushSubscriptionModel').mockResolvedValue(pushSub);
      const enqueueSpy = vi.spyOn(OneSignal._coreDirector._operationRepo, '_enqueue');
      const enqueueAndWaitSpy = vi
        .spyOn(OneSignal._coreDirector._operationRepo, '_enqueueAndWait')
        .mockResolvedValue(undefined);

      await LoginManager.logout();

      expect(enqueueSpy).toHaveBeenCalledOnce();
      expect(enqueueSpy.mock.calls[0][0]).toBeInstanceOf(TransferSubscriptionOperation);
      expect(enqueueAndWaitSpy).toHaveBeenCalledOnce();
      expect(enqueueAndWaitSpy.mock.calls[0][0]).toBeInstanceOf(LoginUserOperation);
    });
  });
});
