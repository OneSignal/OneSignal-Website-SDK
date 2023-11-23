import '../../support/polyfills/polyfills';
import test from 'ava';
import { TestEnvironment } from '../../support/sdk/TestEnvironment';
import { isPushNotificationsSupported } from '../../../src/page/utils/BrowserSupportsPush';
import sinon from 'sinon';
import { setupBrowserWithPushAPIWithVAPIDEnv } from '../../support/tester/utils';

const sandbox = sinon.sandbox.create();

test.beforeEach(async () => {
  await TestEnvironment.stubDomEnvironment();
});

test.afterEach(function () {
  sandbox.restore();
});

function setupBrowserWithPushAPIButNoVAPIDEnv(): void {
  const classDef = function () {};
  classDef.prototype.userVisibleOnly = null;

  sandbox.stub(<any>global, 'PushSubscriptionOptions').value(classDef);
}

// Define window.safari.pushNotification
function setupSafariWithPushEnv(): void {
  sandbox.stub(window, 'safari').value({ pushNotification: {} });
}

// Define window.safari
function setupSafariWithoutPushEnv(): void {
  sandbox.stub(window, 'safari').value({});
}

test('should support browsers that have PushSubscriptionOptions.applicationServerKey defined', async (t) => {
  setupBrowserWithPushAPIWithVAPIDEnv(sandbox);
  t.true(isPushNotificationsSupported());
});

test('should not support browsers without PushSubscriptionOptions', async (t) => {
  t.false(isPushNotificationsSupported());
});

test('should not support browsers without VAPID', async (t) => {
  setupBrowserWithPushAPIButNoVAPIDEnv();
  t.false(isPushNotificationsSupported());
});

test('should support Safari if window.safari.pushNotification is defined', async (t) => {
  setupSafariWithPushEnv();
  t.true(isPushNotificationsSupported());
});

test('should not support Safari unless pushNotification is defined on window.safari', async (t) => {
  setupSafariWithoutPushEnv();
  t.false(isPushNotificationsSupported());
});
