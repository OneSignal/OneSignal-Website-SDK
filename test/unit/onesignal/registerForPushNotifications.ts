import "../../support/polyfills/polyfills";
import test from 'ava';
import sinon, { SinonSandbox } from 'sinon';
import { TestEnvironment, HttpHttpsEnvironment, BrowserUserAgent } from '../../support/sdk/TestEnvironment';
import OneSignalUtils from "../../../src/utils/OneSignalUtils";
import InitHelper from "../../../src/helpers/InitHelper";
import { setBrowser } from '../../support/tester/browser';
import SubscriptionHelper from "../../../src/helpers/SubscriptionHelper";
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

test('registerForPushNotifications: before OneSignal.initialized', async (t) => {
  (global as any).OneSignal.initialized = false;
  (global as any).OneSignal._initCalled = false;

  const utilsStub = sandbox.stub(OneSignalUtils, 'isUsingSubscriptionWorkaround').returns(false);
  sandbox.stub(InitHelper, 'sessionInit').resolves();
  const promise = OneSignal.registerForPushNotifications();
  const newPromise = new Promise((resolve, reject) => {
    promise.then(() => {
      t.is(OneSignal.initialized, true);
      t.is(utilsStub.calledOnce, true);
      resolve();
    });
  });

  Event.trigger(OneSignal.EVENTS.SDK_INITIALIZED);
  await newPromise;
});

test('registerForPushNotifications: after OneSignal.initialized and using subscription workaround', async (t) => {
  t.is(OneSignal.initialized, true);

  const utilsStub = sandbox.stub(OneSignalUtils, 'isUsingSubscriptionWorkaround').returns(true);
  const loadStub = sandbox.stub(InitHelper, 'loadSubscriptionPopup').resolves();
  await OneSignal.registerForPushNotifications();

  t.is(utilsStub.calledOnce, true);
  t.is(loadStub.calledOnce, true);
});

test(
  'registerForPushNotifications: after OneSignal.initialized and not using subscription workaround and safari < 12.1',
  async (t) => {
    setBrowser(BrowserUserAgent.ChromeMacSupported);

    t.is(OneSignal.initialized, true);

    const utilsStub = sandbox.stub(OneSignalUtils, 'isUsingSubscriptionWorkaround').returns(false);
    const loadStub = sandbox.stub(InitHelper, 'sessionInit').resolves();
    await OneSignal.registerForPushNotifications();
    t.is(utilsStub.calledOnce, true);
    t.is(loadStub.calledOnce, true);
});

test('registerForPushNotifications: after OneSignal.initialized and not using subscription workaround and safari 12.1',
  async (t) => {
    setBrowser(BrowserUserAgent.SafariSupportedMac121);
    t.is(OneSignal.initialized, true);


    sandbox.stub(OneSignalUtils, 'isUsingSubscriptionWorkaround').returns(false);

    const loadStub = sandbox.stub(SubscriptionHelper, 'internalRegisterForPush').resolves();
    await OneSignal.registerForPushNotifications();
    t.is(loadStub.calledOnce, true);
});