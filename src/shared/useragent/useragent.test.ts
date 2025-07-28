import BrowserUserAgent from '__test__/support/models/BrowserUserAgent';
import { isMobileBrowser } from './useragent';

describe('isMobileBrowser', () => {
  let originalUserAgent: string;

  beforeEach(() => {
    // Store original userAgent
    originalUserAgent = navigator.userAgent;
  });

  afterEach(() => {
    // Restore original userAgent
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      writable: true,
    });
  });

  const mockUserAgent = (userAgent: string) => {
    Object.defineProperty(navigator, 'userAgent', {
      value: userAgent,
      writable: true,
    });
  };

  describe('isMobileBrowser()', () => {
    [
      {
        userAgent: BrowserUserAgent.iPhone,
        expected: true,
      },
      {
        userAgent: BrowserUserAgent.iPad,
        expected: true,
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
      test(`should detect ${userAgent} as a mobile browser`, () => {
        mockUserAgent(userAgent);
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
        expect(isMobileBrowser()).toBe(expected);
      });
    });

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
      test(`should detect ${userAgent} as tablet`, () => {
        mockUserAgent(userAgent);
        expect(isMobileBrowser()).toBe(expected);
      });
    });

    test('should handle empty user agent', () => {
      mockUserAgent('');
      expect(isMobileBrowser()).toBe(false);
    });
  });
});
