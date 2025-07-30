import { USER_AGENTS } from '__test__/constants';
import { Browser } from './constants';
import { getBrowserName, isMobileBrowser, isTabletBrowser } from './useragent';

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
      expected: Browser.Chrome,
    },
    {
      userAgent: USER_AGENTS.CHROME_MAC,
      expected: Browser.Chrome,
    },
    {
      userAgent: USER_AGENTS.CHROME_LINUX,
      expected: Browser.Chrome,
    },
    {
      userAgent: USER_AGENTS.CHROME_ANDROID,
      expected: Browser.Chrome,
    },
    {
      userAgent: USER_AGENTS.CHROME_IOS_IPHONE,
      expected: Browser.Chrome,
    },
    {
      userAgent: USER_AGENTS.CHROME_IOS_IPAD,
      expected: Browser.Chrome,
    },

    // firefox
    {
      userAgent: USER_AGENTS.FIREFOX_WINDOWS,
      expected: Browser.Firefox,
    },
    {
      userAgent: USER_AGENTS.FIREFOX_MAC,
      expected: Browser.Firefox,
    },
    {
      userAgent: USER_AGENTS.FIREFOX_LINUX,
      expected: Browser.Firefox,
    },
    {
      userAgent: USER_AGENTS.FIREFOX_ANDROID,
      expected: Browser.Firefox,
    },
    {
      userAgent: USER_AGENTS.FIREFOX_IOS,
      expected: Browser.Firefox,
    },

    // edge
    {
      userAgent: USER_AGENTS.EDGE_WINDOWS,
      expected: Browser.Edge,
    },
    {
      userAgent: USER_AGENTS.EDGE_MAC,
      expected: Browser.Edge,
    },
    {
      userAgent: USER_AGENTS.EDGE_IOS,
      expected: Browser.Edge,
    },
    {
      userAgent: USER_AGENTS.EDGE_ANDROID,
      expected: Browser.Edge,
    },

    // safari
    {
      userAgent: USER_AGENTS.SAFARI_MAC,
      expected: Browser.Safari,
    },
    {
      userAgent: USER_AGENTS.SAFARI_IPHONE,
      expected: Browser.Safari,
    },
    {
      userAgent: USER_AGENTS.SAFARI_IPAD,
      expected: Browser.Safari,
    },
    {
      userAgent: USER_AGENTS.SAFARI_IPOD,
      expected: Browser.Safari,
    },
    {
      userAgent: USER_AGENTS.FACEBOOK_APP_IOS,
      expected: Browser.Safari,
    },

    // other
    {
      userAgent: USER_AGENTS.OPERA_WINDOWS,
      expected: Browser.Other,
    },
    {
      userAgent: USER_AGENTS.YANDEX_WINDOWS,
      expected: Browser.Other,
    },
    {
      userAgent: USER_AGENTS.VIVALDI_WINDOWS,
      expected: Browser.Other,
    },
  ].forEach(({ userAgent, expected }) => {
    test(`"${userAgent}" should be ${expected}`, () => {
      mockUserAgent(userAgent);
      expect(getBrowserName()).toBe(expected);
    });
  });
});
