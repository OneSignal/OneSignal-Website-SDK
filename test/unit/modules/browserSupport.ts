import "../../support/polyfills/polyfills";
import test from "ava";
import { TestEnvironment, HttpHttpsEnvironment, BrowserUserAgent } from '../../support/sdk/TestEnvironment';
import { isPushNotificationsSupported } from "../../../src/utils";

function shouldSupport(t, userAgent: BrowserUserAgent, supported: boolean) {
  (window as any).userAgent = userAgent;
  t.true(isPushNotificationsSupported(), `Expected ${BrowserUserAgent[userAgent]} to be supported`)
}
function shouldNotSupport(t, userAgent: BrowserUserAgent, supported: boolean) {
  (window as any).userAgent = userAgent;
  t.false(isPushNotificationsSupported(), `Expected ${BrowserUserAgent[userAgent]} to be unsupported`)
}

test('should support specific browser environments', async t => {
  (global as any).BrowserUserAgent = BrowserUserAgent;
  await TestEnvironment.stubDomEnvironment({
    httpOrHttps: HttpHttpsEnvironment.Https
  });

  shouldSupport(t, BrowserUserAgent.FirefoxMobileSupported, true);
  shouldSupport(t, BrowserUserAgent.FirefoxTabletSupported, true);
  shouldSupport(t, BrowserUserAgent.FirefoxWindowsSupported, true);
  shouldSupport(t, BrowserUserAgent.FirefoxMacSupported, true);
  shouldSupport(t, BrowserUserAgent.FirefoxLinuxSupported, true);

  shouldSupport(t, BrowserUserAgent.SafariSupportedMac, true);

  shouldSupport(t, BrowserUserAgent.ChromeAndroidSupported, true);
  shouldSupport(t, BrowserUserAgent.ChromeWindowsSupported, true);
  shouldSupport(t, BrowserUserAgent.ChromeMacSupported, true);
  shouldSupport(t, BrowserUserAgent.ChromeLinuxSupported, true);
  shouldSupport(t, BrowserUserAgent.ChromeTabletSupported, true);

  shouldSupport(t, BrowserUserAgent.YandexDesktopSupportedHigh, true);
  shouldSupport(t, BrowserUserAgent.YandexDesktopSupportedLow, true);
  shouldSupport(t, BrowserUserAgent.YandexMobileSupported, true);

  shouldSupport(t, BrowserUserAgent.OperaDesktopSupported, true);
  shouldSupport(t, BrowserUserAgent.OperaAndroidSupported, true);
  shouldSupport(t, BrowserUserAgent.OperaTabletSupported, true);

  shouldSupport(t, BrowserUserAgent.VivaldiWindowsSupported, true);
  shouldSupport(t, BrowserUserAgent.VivaldiLinuxSupported, true);
  shouldSupport(t, BrowserUserAgent.VivaldiMacSupported, true);
});

test('should not support specific browser environments', async t => {
  (global as any).BrowserUserAgent = BrowserUserAgent;
  await TestEnvironment.stubDomEnvironment({
    httpOrHttps: HttpHttpsEnvironment.Https
  });
  shouldSupport(t, BrowserUserAgent.iPod, false);
  shouldSupport(t, BrowserUserAgent.iPad, false);
  shouldSupport(t, BrowserUserAgent.iPhone, false);

  shouldSupport(t, BrowserUserAgent.Edge, false);
  shouldSupport(t, BrowserUserAgent.IE11, false);

  shouldSupport(t, BrowserUserAgent.FirefoxMobileUnsupported, false);
  shouldSupport(t, BrowserUserAgent.FirefoxTabletUnsupported, false);

  shouldSupport(t, BrowserUserAgent.SafariUnsupportedMac, false);

  shouldSupport(t, BrowserUserAgent.FacebookBrowseriOS, false);
  shouldSupport(t, BrowserUserAgent.FacebookBrowserAndroid, false);

  shouldSupport(t, BrowserUserAgent.OperaMiniUnsupported, false);

  shouldSupport(t, BrowserUserAgent.ChromeAndroidUnsupported, false);
  shouldSupport(t, BrowserUserAgent.ChromeWindowsUnsupported, false);
  shouldSupport(t, BrowserUserAgent.ChromeMacUnsupported, false);
  shouldSupport(t, BrowserUserAgent.ChromeLinuxUnsupported, false);
  shouldSupport(t, BrowserUserAgent.ChromeTabletUnsupported, false);
});

test('should not support environments without service workers (except Safari)', async t => {
  (global as any).BrowserUserAgent = BrowserUserAgent;
  await TestEnvironment.stubDomEnvironment({
    httpOrHttps: HttpHttpsEnvironment.Https
  });
  // Remove serviceWorker from navigator for testing
  Object.defineProperty(navigator, 'serviceWorker', {
    enumerable: true,
    configurable: true,
    writable: true,
    value: undefined
  });
  (window as any).userAgent = BrowserUserAgent.ChromeMacSupported;
  t.false(isPushNotificationsSupported(), `Expected push to be unsupported if service workers don't exist in a non-Safari browser`);

  (window as any).userAgent = BrowserUserAgent.SafariSupportedMac;
  t.false(isPushNotificationsSupported(), `Expected push to be supported if service workers don't exist in Safari`)
});
