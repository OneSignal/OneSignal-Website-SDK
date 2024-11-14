import { TestEnvironment } from '../../support/environment/TestEnvironment';
import InitHelper from '../../../src/shared/helpers/InitHelper';
import OneSignalEvent from '../../../src/shared/services/OneSignalEvent';
import Log from '../../../src/shared/libraries/Log';
import BrowserUserAgent from '../../support/models/BrowserUserAgent';

//stub dismisshelper
jest.mock('../../../src/shared/helpers/DismissHelper');

describe('Register for push', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    jest.spyOn(Log, 'error').mockImplementation(() => {})
    await TestEnvironment.initialize({
      addPrompts: true,
      userAgent: BrowserUserAgent.Default,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('registerForPushNotifications: before OneSignal.initialized', async () => {
    (global as any).OneSignal.initialized = false;
    (global as any).OneSignal._initCalled = false;

    const spy = jest.spyOn(InitHelper, 'registerForPushNotifications');
    const promise = OneSignal.User.PushSubscription.optIn();

    expect(spy).not.toHaveBeenCalled();
    OneSignalEvent.trigger(OneSignal.EVENTS.SDK_INITIALIZED);
    await promise;
    expect(OneSignal.initialized).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test('registerForPushNotifications: after OneSignal.initialized', async () => {
    (global as any).OneSignal.initialized = true;
    (global as any).OneSignal._initCalled = false;

    const spy = jest.spyOn(InitHelper, 'registerForPushNotifications');
    await InitHelper.registerForPushNotifications();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
