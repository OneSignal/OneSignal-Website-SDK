import InitHelper from '../../../src/shared/helpers/InitHelper';
import Log from '../../../src/shared/libraries/Log';
import OneSignalEvent from '../../../src/shared/services/OneSignalEvent';
import { TestEnvironment } from '../../support/environment/TestEnvironment';
import BrowserUserAgent from '../../support/models/BrowserUserAgent';

//stub dismisshelper
vi.mock('../../../src/shared/helpers/DismissHelper');

//stub log
vi.mock('src/shared/libraries/Log');

describe('Register for push', () => {
  beforeEach(async () => {
    await TestEnvironment.initialize({
      addPrompts: true,
      userAgent: BrowserUserAgent.Default,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  test('registerForPushNotifications: before OneSignal.initialized', async () => {
    (global as any).OneSignal.initialized = false;
    (global as any).OneSignal._initCalled = false;

    const spy = vi.spyOn(InitHelper, 'registerForPushNotifications');
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

    const spy = vi.spyOn(InitHelper, 'registerForPushNotifications');
    await InitHelper.registerForPushNotifications();
    expect(Log.error).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
