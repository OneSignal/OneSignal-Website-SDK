import "../../support/polyfills/polyfills";
import test from "ava";
import { TestEnvironment, HttpHttpsEnvironment, BrowserUserAgent } from "../../support/sdk/TestEnvironment";
import { isPushNotificationsSupported } from "../../../src/utils";

async function isPushSupported(t, userAgent: BrowserUserAgent, supported: boolean, debug?: boolean) {
  (global as any).BrowserUserAgent = BrowserUserAgent;
  await TestEnvironment.stubDomEnvironment({
    httpOrHttps: HttpHttpsEnvironment.Https,
    userAgent: userAgent
  });
  if (debug) {
    debugger;
  }
  if (supported) {
    t.true(isPushNotificationsSupported(), `Expected ${BrowserUserAgent[userAgent]} to be supported`)
  } else {
    t.false(isPushNotificationsSupported(), `Expected ${BrowserUserAgent[userAgent]} to be unsupported`)
  }
}
(isPushSupported as any).title = (_, userAgent: BrowserUserAgent, supported: boolean) => `browser support ${supported ? 'should support' : 'should not support'} ${BrowserUserAgent[userAgent]}`;


test(isPushSupported, BrowserUserAgent.iPod, false);
test(isPushSupported, BrowserUserAgent.iPad, false);
test(isPushSupported, BrowserUserAgent.iPhone, false);

test(isPushSupported, BrowserUserAgent.Edge, false);
test(isPushSupported, BrowserUserAgent.IE11, false);

test(isPushSupported, BrowserUserAgent.FirefoxMobileUnsupported, false);
test(isPushSupported, BrowserUserAgent.FirefoxTabletUnsupported, false);
test(isPushSupported, BrowserUserAgent.FirefoxMobileSupported, true);
test(isPushSupported, BrowserUserAgent.FirefoxTabletSupported, true);
test(isPushSupported, BrowserUserAgent.FirefoxWindowsSupported, true);
test(isPushSupported, BrowserUserAgent.FirefoxMacSupported, true);
test(isPushSupported, BrowserUserAgent.FirefoxLinuxSupported, true);

test(isPushSupported, BrowserUserAgent.SafariUnsupportedMac, false);
test(isPushSupported, BrowserUserAgent.SafariSupportedMac, true);

test(isPushSupported, BrowserUserAgent.FacebookBrowseriOS, false);
test(isPushSupported, BrowserUserAgent.FacebookBrowserAndroid, false);

test(isPushSupported, BrowserUserAgent.ChromeAndroidSupported, true);
test(isPushSupported, BrowserUserAgent.ChromeWindowsSupported, true);
test(isPushSupported, BrowserUserAgent.ChromeMacSupported, true);
test(isPushSupported, BrowserUserAgent.ChromeLinuxSupported, true);
test(isPushSupported, BrowserUserAgent.ChromeTabletSupported, true);

test(isPushSupported, BrowserUserAgent.ChromeAndroidUnsupported, false);
test(isPushSupported, BrowserUserAgent.ChromeWindowsUnsupported, false);
test(isPushSupported, BrowserUserAgent.ChromeMacUnsupported, false);
test(isPushSupported, BrowserUserAgent.ChromeLinuxUnsupported, false);
test(isPushSupported, BrowserUserAgent.ChromeTabletUnsupported, false);

test(isPushSupported, BrowserUserAgent.YandexDesktopSupportedHigh, true);
test(isPushSupported, BrowserUserAgent.YandexDesktopSupportedLow, true);
test(isPushSupported, BrowserUserAgent.YandexMobileSupported, true);

test(isPushSupported, BrowserUserAgent.OperaDesktopSupported, true);
test(isPushSupported, BrowserUserAgent.OperaAndroidSupported, true);
test(isPushSupported, BrowserUserAgent.OperaTabletSupported, true);

test(isPushSupported, BrowserUserAgent.VivaldiWindowsSupported, true);
test(isPushSupported, BrowserUserAgent.VivaldiLinuxSupported, true);
test(isPushSupported, BrowserUserAgent.VivaldiMacSupported, true);