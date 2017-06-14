import "../../support/polyfills/polyfills";
import test from "ava";
import * as sinon from "sinon";
import { TestEnvironment } from '../../support/sdk/TestEnvironment';
import SdkEnvironment from '../../../src/managers/SdkEnvironment';
import { WindowEnvironmentKind } from '../../../src/models/WindowEnvironmentKind';
import { BuildEnvironmentKind } from '../../../src/models/BuildEnvironmentKind';


test('should get service worker window environment', async t => {
  await TestEnvironment.stubServiceWorkerEnvironment();
  t.is(SdkEnvironment.getWindowEnv(), WindowEnvironmentKind.ServiceWorker);
});

test('should get subscription popup window environment', async t => {
  const browser = await TestEnvironment.stubDomEnvironment();

  // For legacy popup URL
  browser.changeURL(window, "https://anything.onesignal.com/initOneSignal");
  t.is(SdkEnvironment.getWindowEnv(), WindowEnvironmentKind.OneSignalSubscriptionPopup);

  // For modern popup URL, using .onesignal.com
  browser.changeURL(window, "https://anything.onesignal.com/subscribe");
  t.is(SdkEnvironment.getWindowEnv(), WindowEnvironmentKind.OneSignalSubscriptionPopup);

  // For modern popup URL, using .os.tc
  browser.changeURL(window, "https://anything.os.tc/subscribe");
  t.is(SdkEnvironment.getWindowEnv(), WindowEnvironmentKind.OneSignalSubscriptionPopup);

  // For modern popup URL, using localhost dev
  const stub = sinon.stub(SdkEnvironment, 'getBuildEnv').returns(BuildEnvironmentKind.Development);
  browser.changeURL(window, "https://anything.localhost:3001/subscribe");
  t.is(SdkEnvironment.getWindowEnv(), WindowEnvironmentKind.OneSignalSubscriptionPopup);
  stub.restore();
});

test('should get host window environment', async t => {
  const browser = await TestEnvironment.stubDomEnvironment();

  browser.changeURL(window, "https://site.com");
  t.is(SdkEnvironment.getWindowEnv(), WindowEnvironmentKind.Host);

  browser.changeURL(window, "https://subdomain.site.com");
  t.is(SdkEnvironment.getWindowEnv(), WindowEnvironmentKind.Host);

  browser.changeURL(window, "http://subdomain.site.com.br:4334");
  t.is(SdkEnvironment.getWindowEnv(), WindowEnvironmentKind.Host);
});

test('should get proxy frame window environment', async t => {
  const browser = await TestEnvironment.stubDomEnvironment();
  browser.reconfigureWindow(window, { top: 'something else' as any });

  browser.changeURL(window, "https://something/webPushIframe");
  t.is(SdkEnvironment.getWindowEnv(), WindowEnvironmentKind.OneSignalProxyFrame);

  browser.changeURL(window, "https://something/webPushModal");
  t.is(SdkEnvironment.getWindowEnv(), WindowEnvironmentKind.OneSignalSubscriptionModal);
});

test('should get custom iFrame window environment', async t => {
  const browser = await TestEnvironment.stubDomEnvironment();
  browser.reconfigureWindow(window, { top: 'something else' as any });

  browser.changeURL(window, "https://my-special-site.com/somepage");
  t.is(SdkEnvironment.getWindowEnv(), WindowEnvironmentKind.CustomIframe);
});

test('API URL should be valid', async t => {
  t.is(SdkEnvironment.getOneSignalApiUrl(BuildEnvironmentKind.Development).toString(), 'https://localhost:3001/api/v1');
  t.is(SdkEnvironment.getOneSignalApiUrl(BuildEnvironmentKind.Staging).toString(), 'https://onesignal-staging.pw/api/v1');
  t.is(SdkEnvironment.getOneSignalApiUrl(BuildEnvironmentKind.Production).toString(), 'https://onesignal.com/api/v1');
});

