import "../../support/polyfills/polyfills";
import test from "ava";
import { TestEnvironment, HttpHttpsEnvironment, BrowserUserAgent } from '../../support/sdk/TestEnvironment';
import { isPushNotificationsSupported } from "../../../src/utils";
import { setUserAgent } from '../../support/tester/browser';


function shouldSupport(t, userAgent: BrowserUserAgent) {
  setUserAgent(userAgent);
  t.true(isPushNotificationsSupported(), `Expected ${BrowserUserAgent[userAgent]} to be supported`)
}
function shouldNotSupport(t, userAgent: BrowserUserAgent) {
  setUserAgent(userAgent);
  t.false(isPushNotificationsSupported(), `Expected ${BrowserUserAgent[userAgent]} to be unsupported`)
}

test('should support specific browser environments', async t => {
  (global as any).BrowserUserAgent = BrowserUserAgent;
  await TestEnvironment.stubDomEnvironment({
    httpOrHttps: HttpHttpsEnvironment.Https
  });

  shouldSupport(t, BrowserUserAgent.FirefoxMobileSupported);
  shouldSupport(t, BrowserUserAgent.FirefoxTabletSupported);
  shouldSupport(t, BrowserUserAgent.FirefoxWindowsSupported);
  shouldSupport(t, BrowserUserAgent.FirefoxMacSupported);
  shouldSupport(t, BrowserUserAgent.FirefoxLinuxSupported);

  shouldSupport(t, BrowserUserAgent.EdgeSupported);

  shouldSupport(t, BrowserUserAgent.SafariSupportedMac);

  shouldSupport(t, BrowserUserAgent.ChromeAndroidSupported);
  shouldSupport(t, BrowserUserAgent.ChromeWindowsSupported);
  shouldSupport(t, BrowserUserAgent.ChromeMacSupported);
  shouldSupport(t, BrowserUserAgent.ChromeLinuxSupported);
  shouldSupport(t, BrowserUserAgent.ChromeTabletSupported);

  shouldSupport(t, BrowserUserAgent.YandexDesktopSupportedHigh);
  shouldSupport(t, BrowserUserAgent.YandexDesktopSupportedLow);
  shouldSupport(t, BrowserUserAgent.YandexMobileSupported);

  shouldSupport(t, BrowserUserAgent.OperaDesktopSupported);
  shouldSupport(t, BrowserUserAgent.OperaAndroidSupported);
  shouldSupport(t, BrowserUserAgent.OperaTabletSupported);

  shouldSupport(t, BrowserUserAgent.VivaldiWindowsSupported);
  shouldSupport(t, BrowserUserAgent.VivaldiLinuxSupported);
  shouldSupport(t, BrowserUserAgent.VivaldiMacSupported);

  shouldSupport(t, BrowserUserAgent.SamsungBrowserSupported);
});

test('should not support specific browser environments', async t => {
  (global as any).BrowserUserAgent = BrowserUserAgent;
  await TestEnvironment.stubDomEnvironment({
    httpOrHttps: HttpHttpsEnvironment.Https
  });
  shouldNotSupport(t, BrowserUserAgent.iPod);
  shouldNotSupport(t, BrowserUserAgent.iPad);
  shouldNotSupport(t, BrowserUserAgent.iPhone);

  shouldNotSupport(t, BrowserUserAgent.EdgeUnsupported);
  shouldNotSupport(t, BrowserUserAgent.EdgeUnsupported2);
  shouldNotSupport(t, BrowserUserAgent.IE11);

  shouldNotSupport(t, BrowserUserAgent.FirefoxMobileUnsupported);
  shouldNotSupport(t, BrowserUserAgent.FirefoxTabletUnsupported);

  shouldNotSupport(t, BrowserUserAgent.SafariUnsupportedMac);

  shouldNotSupport(t, BrowserUserAgent.FacebookBrowseriOS);
  shouldNotSupport(t, BrowserUserAgent.FacebookBrowserAndroid);

  shouldNotSupport(t, BrowserUserAgent.OperaMiniUnsupported);

  shouldNotSupport(t, BrowserUserAgent.ChromeAndroidUnsupported);
  shouldNotSupport(t, BrowserUserAgent.ChromeWindowsUnsupported);
  shouldNotSupport(t, BrowserUserAgent.ChromeMacUnsupported);
  shouldNotSupport(t, BrowserUserAgent.ChromeLinuxUnsupported);
  shouldNotSupport(t, BrowserUserAgent.ChromeTabletUnsupported);

  shouldNotSupport(t, BrowserUserAgent.SamsungBrowserUnsupported);
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
  setUserAgent(BrowserUserAgent.ChromeMacSupported);
  t.false(isPushNotificationsSupported(), `Expected push to be unsupported if service workers don't exist in a non-Safari browser`);

  setUserAgent(BrowserUserAgent.SafariSupportedMac);
  t.true(isPushNotificationsSupported(), `Expected push to be supported if service workers don't exist in Safari`)
});
