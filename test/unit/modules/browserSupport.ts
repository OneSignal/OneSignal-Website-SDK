import "../../support/polyfills/polyfills";
import test from "ava";
import { TestEnvironment } from '../../support/sdk/TestEnvironment';
import { isPushNotificationsSupported } from "../../../src/utils/BrowserSupportsPush";
import sinon from 'sinon';

const sandbox = sinon.sandbox.create();

test.beforeEach(async () => {
  await TestEnvironment.stubDomEnvironment();
});

test.afterEach(function () {
  sandbox.restore();
});

// PushSubscriptionOptions is a class present in browsers that support the Push API
export function browserWithPushAPIWithVAPIDEnv(): void {
  const classDef = function() {};
  classDef.prototype.applicationServerKey = null;
  classDef.prototype.userVisibleOnly = null;

  sandbox.stub((<any>global), "PushSubscriptionOptions").value(classDef);
}

function browserWithPushAPIButNoVAPIDEnv(): void {
  const classDef = function() {};
  classDef.prototype.userVisibleOnly = null;

  sandbox.stub((<any>global), "PushSubscriptionOptions").value(classDef);
}

// Define window.safari.pushNotification
function safariWithPushEnv(): void {
  sandbox.stub((<any>global).self, "safari").value({ pushNotification: {} });
}

// Define window.safari
function safariWithoutPushEnv(): void {
  sandbox.stub((<any>global).self, "safari").value({});
}

test('should support browsers that have PushSubscriptionOptions.applicationServerKey defined', async t => {
  browserWithPushAPIWithVAPIDEnv();
  t.true(isPushNotificationsSupported());
});

test('should not support browsers without PushSubscriptionOptions', async t => {
  t.false(isPushNotificationsSupported());
});

test('should not support browsers without VAPID', async t => {
  browserWithPushAPIButNoVAPIDEnv();
  t.false(isPushNotificationsSupported());
});

test('should support Safari if window.safari.pushNotification is defined', async t => {
  safariWithPushEnv();
  t.true(isPushNotificationsSupported());
});

test('should not support Safari unless pushNotification is defined on window.safari', async t => {
  safariWithoutPushEnv();
  t.false(isPushNotificationsSupported());
});
