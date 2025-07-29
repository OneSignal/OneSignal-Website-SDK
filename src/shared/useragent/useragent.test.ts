import BrowserUserAgent from '__test__/support/models/BrowserUserAgent';
import Bowser from 'bowser';
import { Browser } from './constants';
import { getBrowserName, isMobileBrowser, isTabletBrowser } from './useragent';

const mockUserAgent = (userAgent: string) => {
  Object.defineProperty(navigator, 'userAgent', {
    value: userAgent,
    writable: true,
  });
};

// using third party library to validate our simpler logic
const checkBrowserIsMobile = (userAgent: string) => {
  const browser = Bowser.getParser(userAgent);
  return browser.getPlatformType() === 'mobile';
};

const checkBrowserIsTablet = (userAgent: string) => {
  const browser = Bowser.getParser(userAgent);
  return browser.getPlatformType() === 'tablet';
};

const checkBrowserName = (userAgent: string) => {
  const browser = Bowser.getParser(userAgent);
  const name = browser.getBrowser().name;

  switch (name) {
    case 'Chrome':
      return Browser.Chrome;
    case 'Firefox':
      return Browser.Firefox;
    case 'Microsoft Edge':
      return Browser.Edge;
    case 'Safari':
      return Browser.Safari;
    default:
      return Browser.Other;
  }
};

describe.skip('isMobileBrowser()', () => {
  [
    {
      userAgent: BrowserUserAgent.iPhone,
      expected: true,
    },
    {
      userAgent: BrowserUserAgent.iPad,
      expected: false,
    },
    {
      userAgent: BrowserUserAgent.iPod,
      expected: true,
    },
    {
      userAgent: BrowserUserAgent.ChromeAndroidSupported,
      expected: true,
    },
    {
      userAgent: BrowserUserAgent.FirefoxMobileSupported,
      expected: true,
    },
    {
      userAgent: BrowserUserAgent.OperaAndroidSupported,
      expected: true,
    },
    {
      userAgent: BrowserUserAgent.OperaMiniUnsupported,
      expected: true,
    },
    {
      userAgent: BrowserUserAgent.SamsungBrowserSupported,
      expected: true,
    },
    {
      userAgent: BrowserUserAgent.UcBrowserSupported,
      expected: true,
    },
    {
      userAgent: BrowserUserAgent.FacebookBrowseriOS,
      expected: true,
    },
    {
      userAgent: BrowserUserAgent.FacebookBrowserAndroid,
      expected: true,
    },
    {
      userAgent: BrowserUserAgent.YandexMobileSupported,
      expected: true,
    },
  ].forEach(({ userAgent, expected }) => {
    test(`should detect as a mobile browser "${userAgent}"`, () => {
      mockUserAgent(userAgent);
      expect(checkBrowserIsMobile(userAgent)).toBe(expected);
      expect(isMobileBrowser()).toBe(expected);
    });
  });

  [
    {
      userAgent: BrowserUserAgent.Default,
      expected: false,
    },
    {
      userAgent: BrowserUserAgent.ChromeWindowsSupported,
      expected: false,
    },
    {
      userAgent: BrowserUserAgent.ChromeMacSupported,
      expected: false,
    },
    {
      userAgent: BrowserUserAgent.ChromeLinuxSupported,
      expected: false,
    },
    {
      userAgent: BrowserUserAgent.SafariSupportedMac,
      expected: false,
    },
    {
      userAgent: BrowserUserAgent.FirefoxWindowsSupported,
      expected: false,
    },
    {
      userAgent: BrowserUserAgent.FirefoxMacSupported,
      expected: false,
    },
    {
      userAgent: BrowserUserAgent.FirefoxLinuxSupported,
      expected: false,
    },
    {
      userAgent: BrowserUserAgent.EdgeSupported,
      expected: false,
    },
    {
      userAgent: BrowserUserAgent.OperaDesktopSupported,
      expected: false,
    },
    {
      userAgent: BrowserUserAgent.YandexDesktopSupportedHigh,
      expected: false,
    },
    {
      userAgent: BrowserUserAgent.VivaldiWindowsSupported,
      expected: false,
    },
  ].forEach(({ userAgent, expected }) => {
    test(`should detect ${userAgent} as a desktop browser`, () => {
      mockUserAgent(userAgent);
      expect(checkBrowserIsMobile(userAgent)).toBe(expected);
      expect(isMobileBrowser()).toBe(expected);
    });
  });

  test('should handle empty user agent', () => {
    mockUserAgent('');
    expect(isMobileBrowser()).toBe(false);
  });
});

describe.skip('isTabletBrowser()', () => {
  [
    {
      userAgent: BrowserUserAgent.iPad,
      expected: true,
    },
    {
      userAgent: BrowserUserAgent.ChromeTabletSupported,
      expected: true,
    },
    {
      userAgent: BrowserUserAgent.FirefoxTabletSupported,
      expected: true,
    },
    {
      userAgent: BrowserUserAgent.OperaTabletSupported,
      expected: true,
    },
  ].forEach(({ userAgent, expected }) => {
    test(`should detect as tablet for "${userAgent}"`, () => {
      mockUserAgent(userAgent);
      expect(checkBrowserIsTablet(userAgent)).toBe(expected);
      expect(isTabletBrowser()).toBe(expected);
    });
  });
});

describe('getBrowserName', () => {
  [
    {
      userAgent: BrowserUserAgent.Default,
      expected: Browser.Chrome,
    },
    {
      userAgent: BrowserUserAgent.ChromeWindowsSupported,
      expected: Browser.Chrome,
    },
    {
      userAgent: BrowserUserAgent.FirefoxWindowsSupported,
      expected: Browser.Firefox,
    },
    {
      userAgent: BrowserUserAgent.EdgeSupported,
      expected: Browser.Edge,
    },
    {
      userAgent: BrowserUserAgent.OperaDesktopSupported,
      expected: Browser.Other,
    },
    {
      userAgent: BrowserUserAgent.YandexDesktopSupportedHigh,
      expected: Browser.Other,
    },
    {
      userAgent: BrowserUserAgent.VivaldiWindowsSupported,
      expected: Browser.Other,
    },
    {
      userAgent: BrowserUserAgent.SafariSupportedMac,
      expected: Browser.Safari,
    },
    {
      userAgent: BrowserUserAgent.ChromeAndroidSupported,
      expected: Browser.Chrome,
    },
    {
      userAgent: BrowserUserAgent.FirefoxMobileSupported,
      expected: Browser.Firefox,
    },
    {
      userAgent: BrowserUserAgent.OperaAndroidSupported,
      expected: Browser.Other,
    },
    {
      userAgent: BrowserUserAgent.OperaMiniUnsupported,
      expected: Browser.Other,
    },
    {
      userAgent: BrowserUserAgent.SamsungBrowserSupported,
      expected: Browser.Other,
    },
    {
      userAgent: BrowserUserAgent.UcBrowserSupported,
      expected: Browser.Other,
    },
    {
      userAgent: BrowserUserAgent.FacebookBrowseriOS,
      expected: Browser.Safari,
    },
    {
      userAgent: BrowserUserAgent.FacebookBrowserAndroid,
      expected: Browser.Chrome,
    },
    {
      userAgent: BrowserUserAgent.YandexMobileSupported,
      expected: Browser.Other,
    },
    {
      userAgent: BrowserUserAgent.ChromeTabletSupported,
      expected: Browser.Chrome,
    },
    {
      userAgent: BrowserUserAgent.FirefoxTabletSupported,
      expected: Browser.Firefox,
    },
    {
      userAgent: BrowserUserAgent.OperaTabletSupported,
      expected: Browser.Other,
    },
    {
      userAgent: BrowserUserAgent.iPad,
      expected: Browser.Safari,
    },
    {
      userAgent: BrowserUserAgent.iPhone,
      expected: Browser.Safari,
    },
    {
      userAgent: BrowserUserAgent.iPod,
      expected: Browser.Safari,
    },
  ].forEach(({ userAgent, expected }) => {
    test(`should return the correct browser name for "${userAgent}"`, () => {
      mockUserAgent(userAgent);
      expect(checkBrowserName(userAgent)).toBe(expected);
      expect(getBrowserName()).toBe(expected);
    });
  });
});
