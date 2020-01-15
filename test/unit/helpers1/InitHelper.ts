import "../../support/polyfills/polyfills";
import test from 'ava';
import sinon, { SinonSandbox } from 'sinon';
import InitHelper from "../../../src/helpers/InitHelper";
import OneSignalUtils from "../../../src/utils/OneSignalUtils";
import { TestEnvironment, BrowserUserAgent } from '../../support/sdk/TestEnvironment';
import { setBrowser } from '../../support/tester/browser';
import { stubMessageChannel } from '../../support/tester/utils';
import SubscriptionHelper from "../../../src/helpers/SubscriptionHelper";
import OneSignal from "../../../src/OneSignal"

let sandbox: SinonSandbox = sinon.sandbox.create();

test.beforeEach(async () => {
  await TestEnvironment.initialize();
  TestEnvironment.mockInternalOneSignal();
});

test.afterEach(() => {
  sandbox.restore();
});

/** registerForPushNotifications */
test('registerForPushNotifications: requesting a modal prompt', async (t) => {
  stubMessageChannel(t);

  await InitHelper.registerForPushNotifications({ modalPrompt: true });
  t.not(OneSignal.subscriptionModalHost, undefined);
  t.not(OneSignal.subscriptionModalHost.modal, undefined);
});

test('registerForPushNotifications: load fullscreen popup when using subscription workaround', async (t) => {

  const utilsStub = sandbox.stub(OneSignalUtils, 'isUsingSubscriptionWorkaround').returns(true);
  const loadStub = sandbox.stub(InitHelper, 'loadSubscriptionPopup').resolves();
  await InitHelper.registerForPushNotifications();

  t.is(utilsStub.calledOnce, true);
  t.is(loadStub.calledOnce, true);
});

/** onSdkInitialized */
test("onSdkInitialized: ensure public sdk initialized triggered", async (t) => {
  OneSignal.on(OneSignal.EVENTS.SDK_INITIALIZED_PUBLIC, () => { t.pass(); });
  await InitHelper.onSdkInitialized();
});

test("onSdkInitialized: processes expiring subscriptions", async (t) => {
  const spy = sandbox.stub(InitHelper, "processExpiringSubscriptions").resolves();
  await InitHelper.onSdkInitialized();
  t.true(spy.calledOnce);
});

test("onSdkInitialized: sends on session update only if both autoPrompt and autoResubscribe are false", async (t) => {
  const spy = sandbox.stub(OneSignal.context.updateManager, "sendOnSessionUpdate").resolves();
  sandbox.stub(OneSignalUtils, "isUsingSubscriptionWorkaround").resolves(false);
  
  OneSignal.config.userConfig.promptOptions.autoPrompt = false;
  OneSignal.config.userConfig.autoResubscribe = false;
  await InitHelper.onSdkInitialized();
  t.true(spy.calledOnce);
});

test("onSdkInitialized: does not send on session update", async (t) => {
  const spy = sandbox.stub(OneSignal.context.updateManager, "sendOnSessionUpdate").resolves();
  sandbox.stub(OneSignalUtils, "isUsingSubscriptionWorkaround").resolves(false);
  
  OneSignal.config.userConfig.promptOptions.autoPrompt = true;
  OneSignal.config.userConfig.autoResubscribe = true;
  await InitHelper.onSdkInitialized();
  t.true(spy.notCalled);

  OneSignal.config.userConfig.promptOptions.autoPrompt = false;
  OneSignal.config.userConfig.autoResubscribe = true;
  await InitHelper.onSdkInitialized();
  t.true(spy.notCalled);

  OneSignal.config.userConfig.promptOptions.autoPrompt = true;
  OneSignal.config.userConfig.autoResubscribe = false;
  await InitHelper.onSdkInitialized();
  t.true(spy.notCalled);
});
