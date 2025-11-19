import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { updateIdentityModel } from '__test__/support/helpers/setup';
import { db } from 'src/shared/database/client';
import Log from 'src/shared/libraries/Log';
import * as userDirector from '../../onesignal/userDirector';
import LoginManager from './LoginManager';

const createUserOnServerSpy = vi.spyOn(
  userDirector,
  'createUserOnServer',
).mockResolvedValue(undefined);

describe('LoginManager', () => {
  beforeEach(() => {
    TestEnvironment.initialize();
  });

  test('login: skips when externalId unchanged and logs debug', async () => {
    const debugSpy = vi
      .spyOn(Log, '_debug')
      .mockImplementation(() => undefined);
    await updateIdentityModel('external_id', 'same-id');

    await LoginManager.login('same-id');
    expect(debugSpy).toHaveBeenCalledWith(
      'Login: External ID already set, skipping login',
    );
  });

  test('login: stores token when provided and enqueues operations', async () => {
    const dbSpy = vi.spyOn(db, 'put');
    // mock push subscription exists so transfer op enqueues
    vi.spyOn(
      OneSignal._coreDirector,
      '_getPushSubscriptionModel',
    ).mockResolvedValue({
      id: 'push-sub-id',
    } as any);
    const enqueueSpy = vi
      .spyOn(OneSignal._coreDirector._operationRepo, '_enqueue')
      .mockResolvedValue(undefined);
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

  test('logout: no external id logs debug and returns', async () => {
    const debugSpy = vi
      .spyOn(Log, '_debug')
      .mockImplementation(() => undefined);
    await updateIdentityModel('external_id', undefined);
    await LoginManager.logout();
    expect(debugSpy).toHaveBeenCalledWith(
      'Logout: User is not logged in, skipping logout',
    );
  });

  test('logout: with external id resets models and creates anonymous user', async () => {
    await updateIdentityModel('external_id', 'abc');
    await LoginManager.logout();
    expect(createUserOnServerSpy).toHaveBeenCalled();
  });
});
