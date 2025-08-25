import * as InitHelper from '../../../src/shared/helpers/init';
import Log from '../../../src/shared/libraries/Log';
import OneSignalEvent from '../../../src/shared/services/OneSignalEvent';
import { TestEnvironment } from '../../support/environment/TestEnvironment';

//stub dismisshelper
vi.mock('src/shared/helpers/DismissHelper');

//stub log
vi.mock('src/shared/libraries/Log');

const spy = vi.spyOn(InitHelper, 'registerForPushNotifications');

describe('Register for push', () => {
  beforeEach(() => {
    TestEnvironment.initialize({
      addPrompts: true,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  test('registerForPushNotifications: before OneSignal.initialized', async () => {
    (global as any).OneSignal.initialized = false;
    (global as any).OneSignal._initCalled = false;

    const promise = OneSignal.User.PushSubscription.optIn();

    expect(spy).not.toHaveBeenCalled();
    OneSignalEvent.trigger(OneSignal.EVENTS.SDK_INITIALIZED);
    await promise;
    expect(Log.error).toHaveBeenCalled();
    expect(OneSignal.initialized).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  // Revisit with Vitest change
  test('registerForPushNotifications: after OneSignal.initialized', async () => {
    (global as any).OneSignal.initialized = true;
    (global as any).OneSignal._initCalled = false;

    await InitHelper.registerForPushNotifications();
    expect(Log.error).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
