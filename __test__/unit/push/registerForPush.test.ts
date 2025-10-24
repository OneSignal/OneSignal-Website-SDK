import * as InitHelper from '../../../src/shared/helpers/init';
import OneSignalEvent from '../../../src/shared/services/OneSignalEvent';
import { TestEnvironment } from '../../support/environment/TestEnvironment';

//stub dismisshelper
vi.mock('src/shared/helpers/DismissHelper');

//stub log
vi.mock('src/shared/libraries/Log');

const spy = vi.spyOn(InitHelper, 'registerForPushNotifications');

declare const global: {
  OneSignal: typeof OneSignal;
};

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
    global.OneSignal._initialized = false;
    global.OneSignal._initCalled = false;

    const promise = OneSignal.User.PushSubscription.optIn();

    expect(spy).not.toHaveBeenCalled();
    OneSignalEvent._trigger('initializeInternal');
    await promise;
    expect(OneSignal._initialized).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  // Revisit with Vitest change
  test('registerForPushNotifications: after OneSignal.initialized', async () => {
    global.OneSignal._initialized = true;
    global.OneSignal._initCalled = false;

    await expect(InitHelper.registerForPushNotifications()).resolves.toBe(
      false,
    );
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
