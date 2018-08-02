import "../../support/polyfills/polyfills";
import test from "ava";
import sinon from "sinon";
import { TestEnvironment } from '../../support/sdk/TestEnvironment';
import SdkEnvironment from '../../../src/managers/SdkEnvironment';
import { WindowEnvironmentKind } from '../../../src/models/WindowEnvironmentKind';
import { BuildEnvironmentKind } from '../../../src/models/BuildEnvironmentKind';
import { IntegrationKind } from '../../../src/models/IntegrationKind';


test('should get service worker window environment', async t => {
  await TestEnvironment.stubServiceWorkerEnvironment();
  t.is(SdkEnvironment.getWindowEnv(), WindowEnvironmentKind.ServiceWorker);
});

test('getWindowEnv should get subscription popup window environment', async t => {
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

test('getWindowEnv should get host window environment', async t => {
  const browser = await TestEnvironment.stubDomEnvironment();

  browser.changeURL(window, "https://site.com");
  t.is(SdkEnvironment.getWindowEnv(), WindowEnvironmentKind.Host);

  browser.changeURL(window, "https://subdomain.site.com");
  t.is(SdkEnvironment.getWindowEnv(), WindowEnvironmentKind.Host);

  browser.changeURL(window, "http://subdomain.site.com.br:4334");
  t.is(SdkEnvironment.getWindowEnv(), WindowEnvironmentKind.Host);
});

test('getWindowEnv should get proxy frame window environment', async t => {
  const browser = await TestEnvironment.stubDomEnvironment();
  browser.reconfigureWindow(window, { top: 'something else' as any });

  browser.changeURL(window, "https://something/webPushIframe");
  t.is(SdkEnvironment.getWindowEnv(), WindowEnvironmentKind.OneSignalProxyFrame);

  browser.changeURL(window, "https://something/webPushModal");
  t.is(SdkEnvironment.getWindowEnv(), WindowEnvironmentKind.OneSignalSubscriptionModal);
});

test('getWindowEnv should get custom iFrame window environment', async t => {
  const browser = await TestEnvironment.stubDomEnvironment();
  browser.reconfigureWindow(window, { top: 'something else' as any });

  browser.changeURL(window, "https://my-special-site.com/somepage");
  t.is(SdkEnvironment.getWindowEnv(), WindowEnvironmentKind.CustomIframe);
});

test('API URL should be valid', async t => {
  t.is(SdkEnvironment.getOneSignalApiUrl(BuildEnvironmentKind.Development).toString(), 'https://localhost:3001/api/v1');
  t.is(SdkEnvironment.getOneSignalApiUrl(BuildEnvironmentKind.Staging).toString(), 'https://staging-01.onesignal.com/api/v1');
  t.is(SdkEnvironment.getOneSignalApiUrl(BuildEnvironmentKind.Production).toString(), 'https://onesignal.com/api/v1');
});

function mockParentFrame(https: boolean): sinon.SinonStub {
  let stub: sinon.SinonStub;
  if (https) {
    stub = sinon.stub(navigator.serviceWorker, "getRegistration").resolves({});
  } else {
    // HTTP sites can't use ServiceWorkerContainer.getRegistration()
    stub = sinon.stub(navigator.serviceWorker, "getRegistration").throws("SecurityError");
  }
  return stub;
}

function restoreParentFrameMock(stub: sinon.SinonStub) {
  if (stub) {
    stub.restore();
  }
}

test('getIntegration should return Secure in HTTPS top-level frame', async t => {
  const browser = await TestEnvironment.stubDomEnvironment();
  browser.reconfigureWindow(window, { top: window });
  browser.changeURL(window, "https://site.com");
  t.is(await SdkEnvironment.getIntegration(false), IntegrationKind.Secure);
});

test('getIntegration should return Secure in HTTPS child frame under top-level HTTPS frame', async t => {
  const browser = await TestEnvironment.stubDomEnvironment();
  browser.reconfigureWindow(window, { top: 'another frame' as any });
  browser.changeURL(window, "https://site.com");
  const stub = mockParentFrame(true);
  t.is(await SdkEnvironment.getIntegration(false), IntegrationKind.Secure);
  restoreParentFrameMock(stub);
});

test('getIntegration should return SecureProxy in HTTPS top-level frame using proxy origin', async t => {
  const browser = await TestEnvironment.stubDomEnvironment();
  browser.reconfigureWindow(window, { top: window });
  browser.changeURL(window, "https://site.com");
  t.is(await SdkEnvironment.getIntegration(true), IntegrationKind.SecureProxy);
});

test(
  'getIntegration should return SecureProxy in HTTPS child frame using proxy origin under top-level HTTPS frame',
  async t => {
    const browser = await TestEnvironment.stubDomEnvironment();
    browser.reconfigureWindow(window, { top: 'another frame' as any });
    browser.changeURL(window, "https://site.com");
    const stub = mockParentFrame(true);
    t.is(await SdkEnvironment.getIntegration(true), IntegrationKind.SecureProxy);
    restoreParentFrameMock(stub);
});

test('getIntegration should return InsecureProxy in HTTP top-level frame using proxy origin', async t => {
  const browser = await TestEnvironment.stubDomEnvironment();
  browser.reconfigureWindow(window, { top: window });
  browser.changeURL(window, "http://site.com");
  t.is(await SdkEnvironment.getIntegration(true), IntegrationKind.InsecureProxy);
});

test('getIntegration should return InsecureProxy in HTTP top-level frame not using proxy origin', async t => {
  const browser = await TestEnvironment.stubDomEnvironment();
  browser.reconfigureWindow(window, { top: window });
  browser.changeURL(window, "http://site.com");
  t.is(await SdkEnvironment.getIntegration(false), IntegrationKind.InsecureProxy);
});

test('getIntegration should return InsecureProxy in HTTPS child frame under top-level HTTP frame', async t => {
  const browser = await TestEnvironment.stubDomEnvironment();
  browser.reconfigureWindow(window, { top: 'another frame' as any });
  browser.changeURL(window, "https://site.com");
  const stub = mockParentFrame(false);
  t.is(await SdkEnvironment.getIntegration(true), IntegrationKind.InsecureProxy);
  restoreParentFrameMock(stub);
});


