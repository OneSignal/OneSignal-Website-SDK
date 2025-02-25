import {
  isIosSafari,
  isPushNotificationsSupported,
} from './BrowserSupportsPush';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';

describe('BrowserSupportsPush', () => {
  beforeEach(async () => {
    Object.defineProperty(global, 'PushSubscriptionOptions', {
      value: {
        prototype: {
          applicationServerKey: 'test',
        },
      },
      writable: true,
    });
    await TestEnvironment.initialize();
  });

  test('can check if browser supports push notifications', () => {
    expect(isPushNotificationsSupported()).toBe(true);

    Object.defineProperty(global, 'PushSubscriptionOptions', {
      value: undefined,
      writable: true,
    });
    expect(isPushNotificationsSupported()).toBe(false);

    Object.defineProperty(window, 'safari', {
      value: {
        pushNotification: {},
      },
      writable: true,
    });
    expect(isPushNotificationsSupported()).toBe(true);
  });

  test('can check if on ios safari browser', () => {
    expect(isIosSafari()).toBe(false);

    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 1,
      writable: true,
    });
    expect(isIosSafari()).toBe(true);
  });
});
