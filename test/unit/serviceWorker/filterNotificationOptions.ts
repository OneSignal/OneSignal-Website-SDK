import '../../support/polyfills/polyfills';
import test from 'ava';
import { ServiceWorker } from '../../../src/service-worker/ServiceWorker';
import { setUserAgent } from '../../support/tester/browser';
import { BrowserUserAgent, TestEnvironment, HttpHttpsEnvironment } from '../../support/sdk/TestEnvironment';


test(`Chrome on Mac should set requireInteraction to false`, async t => {
  await TestEnvironment.stubDomEnvironment({
    httpOrHttps: HttpHttpsEnvironment.Https
  });
  setUserAgent(BrowserUserAgent.ChromeMacSupported);
  const filteredOptions = ServiceWorker.filterNotificationOptions({});
  t.is(filteredOptions.requireInteraction, false);
});

test(`A browser env other than Chrome on Mac should not have requireInteraction forced to false`, async t => {
  await TestEnvironment.stubDomEnvironment({
    httpOrHttps: HttpHttpsEnvironment.Https
  });
  setUserAgent(BrowserUserAgent.FirefoxMacSupported);
  const filteredOptions = ServiceWorker.filterNotificationOptions({
    requireInteraction: true
  });
  t.is(filteredOptions.requireInteraction, true);
});
