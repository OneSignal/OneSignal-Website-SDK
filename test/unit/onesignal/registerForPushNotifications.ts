import "../../support/polyfills/polyfills";
import test from 'ava';
import sinon, { SinonSandbox } from 'sinon';
import { TestEnvironment, HttpHttpsEnvironment } from '../../support/sdk/TestEnvironment';
import InitHelper from "../../../src/helpers/InitHelper";
import Event from '../../../src/Event';

let sandbox: SinonSandbox;

test.beforeEach(async () => {
  sandbox = sinon.sandbox.create();
  await TestEnvironment.initialize({
    addPrompts: true,
    httpOrHttps: HttpHttpsEnvironment.Https,
  });
  TestEnvironment.mockInternalOneSignal();
});

test.afterEach(function () {
  sandbox.restore();
});

test('registerForPushNotifications: before OneSignal.initialized', async t => {
  (global as any).OneSignal.initialized = false;
  (global as any).OneSignal._initCalled = false;

  const spy = sandbox.stub(InitHelper, 'registerForPushNotifications').resolves();
  const promise = OneSignal.registerForPushNotifications();

  t.is(spy.notCalled, true);
  Event.trigger(OneSignal.EVENTS.SDK_INITIALIZED);
  await promise;
  t.is(OneSignal.initialized, true);
  t.is(spy.calledOnce, true);
});

test('registerForPushNotifications: after OneSignal.initialized', async t => {
  (global as any).OneSignal.initialized = true;
  (global as any).OneSignal._initCalled = false;

  const spy = sandbox.stub(InitHelper, 'registerForPushNotifications').resolves();
  await OneSignal.registerForPushNotifications();
  t.is(spy.calledOnce, true);
});
