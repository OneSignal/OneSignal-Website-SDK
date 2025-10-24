import { USER_AGENTS } from '__test__/constants';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { Browser } from './constants';
import {
  getBrowserName,
  getBrowserVersion,
  isIosSafari,
  isMobileBrowser,
  isPushNotificationsSupported,
  isTabletBrowser,
} from './detect';

const mockUserAgent = (userAgent: string) => {
  Object.defineProperty(navigator, 'userAgent', {
    value: userAgent,
    writable: true,
  });
};

describe('isMobileBrowser()', () => {
  [
    // non mobile / is tablet
    {
      userAgent: USER_AGENTS.CHROME_WINDOWS,
      expected: false,
    },
    {
      userAgent: USER_AGENTS.CHROME_MAC,
      expected: false,
    },
    {
      userAgent: USER_AGENTS.CHROME_LINUX,
      expected: false,
    },
    {
      userAgent: USER_AGENTS.CHROME_IOS_IPAD,
      expected: false,
    },

    {
      userAgent: USER_AGENTS.FIREFOX_WINDOWS,
      expected: false,
    },
    {
      userAgent: USER_AGENTS.FIREFOX_MAC,
      expected: false,
    },
    {
      userAgent: USER_AGENTS.SAFARI_IPAD,
      expected: false,
    },
    {
      userAgent: USER_AGENTS.EDGE_MAC,
      expected: false,
    },
    {
      userAgent: USER_AGENTS.EDGE_WINDOWS,
      expected: false,
    },
    {
      userAgent: USER_AGENTS.OPERA_WINDOWS,
      expected: false,
    },
    {
      userAgent: USER_AGENTS.YANDEX_WINDOWS,
      expected: false,
    },
    {
      userAgent: USER_AGENTS.VIVALDI_WINDOWS,
      expected: false,
    },

    // mobile
    {
      userAgent: USER_AGENTS.CHROME_ANDROID,
      expected: true,
    },
    {
      userAgent: USER_AGENTS.CHROME_IOS_IPHONE,
      expected: true,
    },
    {
      userAgent: USER_AGENTS.CHROME_IOS_IPOD,
      expected: true,
    },
    {
      userAgent: USER_AGENTS.FIREFOX_ANDROID,
      expected: true,
    },
    {
      userAgent: USER_AGENTS.FIREFOX_IOS,
      expected: true,
    },
    {
      userAgent: USER_AGENTS.SAFARI_IPHONE,
      expected: true,
    },
    {
      userAgent: USER_AGENTS.SAFARI_IPOD,
      expected: true,
    },
    {
      userAgent: USER_AGENTS.EDGE_ANDROID,
      expected: true,
    },
    {
      userAgent: USER_AGENTS.EDGE_IOS,
      expected: true,
    },
    {
      userAgent: USER_AGENTS.FACEBOOK_APP_IOS,
      expected: true,
    },
  ].forEach(({ userAgent, expected }) => {
    test(`"${userAgent}" should ${expected ? 'be' : 'not be'} a mobile browser`, () => {
      mockUserAgent(userAgent);
      expect(isMobileBrowser()).toBe(expected);
    });
  });

  test('should handle empty user agent', () => {
    mockUserAgent('');
    expect(isMobileBrowser()).toBe(false);
  });
});

describe('isTabletBrowser()', () => {
  [
    // non tablet or is mobile
    {
      userAgent: USER_AGENTS.CHROME_WINDOWS,
      expected: false,
    },
    {
      userAgent: USER_AGENTS.CHROME_MAC,
      expected: false,
    },
    {
      userAgent: USER_AGENTS.CHROME_LINUX,
      expected: false,
    },
    {
      userAgent: USER_AGENTS.CHROME_IOS_IPHONE,
      expected: false,
    },
    {
      userAgent: USER_AGENTS.FIREFOX_WINDOWS,
      expected: false,
    },
    {
      userAgent: USER_AGENTS.FIREFOX_MAC,
      expected: false,
    },
    {
      userAgent: USER_AGENTS.FIREFOX_IOS,
      expected: false,
    },
    {
      userAgent: USER_AGENTS.SAFARI_MAC,
      expected: false,
    },
    {
      userAgent: USER_AGENTS.SAFARI_IPHONE,
      expected: false,
    },
    {
      userAgent: USER_AGENTS.EDGE_MAC,
      expected: false,
    },
    {
      userAgent: USER_AGENTS.EDGE_WINDOWS,
      expected: false,
    },

    // tablet
    {
      userAgent: USER_AGENTS.CHROME_IOS_IPAD,
      expected: true,
    },
    {
      userAgent: USER_AGENTS.SAFARI_IPAD,
      expected: true,
    },
    {
      userAgent: USER_AGENTS.SAMSUNG_TABLET,
      expected: true,
    },
    {
      userAgent: USER_AGENTS.GOOGLE_TABLET,
      expected: true,
    },
  ].forEach(({ userAgent, expected }) => {
    test(`"${userAgent}" should ${expected ? 'be' : 'not be'} a tablet browser`, () => {
      mockUserAgent(userAgent);
      expect(isTabletBrowser()).toBe(expected);
    });
  });
});

describe('getBrowserName()', () => {
  [
    // chrome
    {
      userAgent: USER_AGENTS.CHROME_WINDOWS,
      expected: Browser._Chrome,
    },
    {
      userAgent: USER_AGENTS.CHROME_MAC,
      expected: Browser._Chrome,
    },
    {
      userAgent: USER_AGENTS.CHROME_LINUX,
      expected: Browser._Chrome,
    },
    {
      userAgent: USER_AGENTS.CHROME_ANDROID,
      expected: Browser._Chrome,
    },
    {
      userAgent: USER_AGENTS.CHROME_IOS_IPHONE,
      expected: Browser._Chrome,
    },
    {
      userAgent: USER_AGENTS.CHROME_IOS_IPAD,
      expected: Browser._Chrome,
    },

    // firefox
    {
      userAgent: USER_AGENTS.FIREFOX_WINDOWS,
      expected: Browser._Firefox,
    },
    {
      userAgent: USER_AGENTS.FIREFOX_MAC,
      expected: Browser._Firefox,
    },
    {
      userAgent: USER_AGENTS.FIREFOX_LINUX,
      expected: Browser._Firefox,
    },
    {
      userAgent: USER_AGENTS.FIREFOX_ANDROID,
      expected: Browser._Firefox,
    },
    {
      userAgent: USER_AGENTS.FIREFOX_IOS,
      expected: Browser._Firefox,
    },

    // edge
    {
      userAgent: USER_AGENTS.EDGE_WINDOWS,
      expected: Browser._Edge,
    },
    {
      userAgent: USER_AGENTS.EDGE_MAC,
      expected: Browser._Edge,
    },
    {
      userAgent: USER_AGENTS.EDGE_IOS,
      expected: Browser._Edge,
    },
    {
      userAgent: USER_AGENTS.EDGE_ANDROID,
      expected: Browser._Edge,
    },

    // safari
    {
      userAgent: USER_AGENTS.SAFARI_MAC,
      expected: Browser._Safari,
    },
    {
      userAgent: USER_AGENTS.SAFARI_IPHONE,
      expected: Browser._Safari,
    },
    {
      userAgent: USER_AGENTS.SAFARI_IPAD,
      expected: Browser._Safari,
    },
    {
      userAgent: USER_AGENTS.SAFARI_IPOD,
      expected: Browser._Safari,
    },

    // other
    {
      userAgent: USER_AGENTS.OPERA_WINDOWS,
      expected: Browser._Other,
    },
    {
      userAgent: USER_AGENTS.YANDEX_WINDOWS,
      expected: Browser._Other,
    },
    {
      userAgent: USER_AGENTS.VIVALDI_WINDOWS,
      expected: Browser._Other,
    },
    {
      userAgent: USER_AGENTS.FACEBOOK_APP_ANDROID,
      expected: Browser._Other,
    },
    {
      userAgent: USER_AGENTS.FACEBOOK_APP_IOS,
      expected: Browser._Other,
    },
  ].forEach(({ userAgent, expected }) => {
    test(`"${userAgent}" should be ${expected}`, () => {
      mockUserAgent(userAgent);
      expect(getBrowserName()).toBe(expected);
    });
  });
});

describe('getBrowserVersion()', () => {
  [
    // chrome
    {
      userAgent: USER_AGENTS.CHROME_WINDOWS,
      expected: 138,
    },
    {
      userAgent: USER_AGENTS.CHROME_MAC,
      expected: 138.1,
    },
    {
      userAgent: USER_AGENTS.CHROME_LINUX,
      expected: 138.2,
    },
    {
      userAgent: USER_AGENTS.CHROME_ANDROID,
      expected: 137.0,
    },
    {
      userAgent: USER_AGENTS.CHROME_IOS_IPHONE,
      expected: 139.0,
    },
    {
      userAgent: USER_AGENTS.CHROME_IOS_IPAD,
      expected: 139.0,
    },
    {
      userAgent: USER_AGENTS.CHROME_IOS_IPOD,
      expected: 139.0,
    },

    // firefox
    {
      userAgent: USER_AGENTS.FIREFOX_WINDOWS,
      expected: 141.1,
    },
    {
      userAgent: USER_AGENTS.FIREFOX_MAC,
      expected: 141.0,
    },
    {
      userAgent: USER_AGENTS.FIREFOX_LINUX,
      expected: 141.0,
    },
    {
      userAgent: USER_AGENTS.FIREFOX_ANDROID,
      expected: 141.0,
    },
    {
      userAgent: USER_AGENTS.FIREFOX_IOS,
      expected: 141.0,
    },

    // edge
    {
      userAgent: USER_AGENTS.EDGE_WINDOWS,
      expected: 137.0,
    },
    {
      userAgent: USER_AGENTS.EDGE_MAC,
      expected: 136.3351,
    },

    // safari
    {
      userAgent: USER_AGENTS.SAFARI_MAC,
      expected: 18.4,
    },
    {
      userAgent: USER_AGENTS.SAFARI_IPHONE,
      expected: 18.4,
    },
    {
      userAgent: USER_AGENTS.SAFARI_IPAD,
      expected: 18.4,
    },
    {
      userAgent: USER_AGENTS.SAFARI_IPOD,
      expected: 18.4,
    },

    // opera
    {
      userAgent: USER_AGENTS.OPERA_WINDOWS,
      expected: 120.0,
    },

    // yandex
    {
      userAgent: USER_AGENTS.YANDEX_WINDOWS,
      expected: 25.6,
    },

    // vivaldi
    {
      userAgent: USER_AGENTS.VIVALDI_WINDOWS,
      expected: 7.5,
    },

    // facebook app
    {
      userAgent: USER_AGENTS.FACEBOOK_APP_IOS,
      expected: 238.0,
    },
    {
      userAgent: USER_AGENTS.FACEBOOK_APP_ANDROID,
      expected: 457.0,
    },
  ].forEach(({ userAgent, expected }) => {
    test(`"${userAgent}" should be ${expected}`, () => {
      mockUserAgent(userAgent);
      expect(getBrowserVersion()).toBe(expected);
    });
  });
});

describe('isPushNotificationsSupported()', () => {
  beforeEach(() => {
    Object.defineProperty(global, 'PushSubscriptionOptions', {
      value: {
        prototype: {
          applicationServerKey: 'test',
        },
      },
      writable: true,
    });
    TestEnvironment.initialize();
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
});

describe('isIosSafari()', () => {
  beforeEach(() => {
    TestEnvironment.initialize();
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
