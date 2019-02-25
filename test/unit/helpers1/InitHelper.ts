import "../../support/polyfills/polyfills";
import test from 'ava';
import sinon, { SinonSandbox } from 'sinon';
import InitHelper from "../../../src/helpers/InitHelper";
import OneSignalUtils from "../../../src/utils/OneSignalUtils";
import { TestEnvironment, BrowserUserAgent } from '../../support/sdk/TestEnvironment';
import { setBrowser } from '../../support/tester/browser';
import { stubMessageChannel } from '../../support/tester/utils';
import SubscriptionHelper from "../../../src/helpers/SubscriptionHelper";

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

test('registerForPushNotifications: not using subscription workaround and safari < 12.1 and never subscribed',
  async (t) => {
    setBrowser(BrowserUserAgent.ChromeMacSupported);

    sandbox.stub(OneSignal, 'internalIsOptedOut').resolves(false);
    const registerSpy = sandbox.stub(SubscriptionHelper, 'registerForPush').resolves();
    await InitHelper.registerForPushNotifications();
    t.is(registerSpy.calledOnce, true);
});

test('registerForPushNotifications: not using subscription workaround and safari < 12.1 and opted out',
  async (t) => {
    setBrowser(BrowserUserAgent.ChromeMacSupported);

    sandbox.stub(OneSignal, 'internalIsOptedOut').resolves(true);
    const registerSpy = sandbox.stub(SubscriptionHelper, 'registerForPush').resolves();
    await InitHelper.registerForPushNotifications();
    t.is(registerSpy.notCalled, true);
});

test('registerForPushNotifications: after OneSignal.initialized and not using subscription workaround and safari 12.1',
  async (t) => {
    setBrowser(BrowserUserAgent.SafariSupportedMac121);

    const registerStub = sandbox.stub(SubscriptionHelper, 'internalRegisterForPush').resolves();
    await InitHelper.registerForPushNotifications();
    t.is(registerStub.calledOnce, true);
});

/** sessionInit */


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

test("onSdkInitialized: sends on session update if not in autoPrompt", async (t) => {
  const spy = sandbox.stub(OneSignal.context.updateManager, "sendOnSessionUpdate").resolves();
  sandbox.stub(OneSignalUtils, "isUsingSubscriptionWorkaround").resolves(false);
  
  OneSignal.config.userConfig.promptOptions.autoPrompt = false;
  await InitHelper.onSdkInitialized();
  t.true(spy.calledOnce);
});

test("onSdkInitialized: sends on session update if not in autoPrompt", async (t) => {
  const spy = sandbox.stub(OneSignal.context.updateManager, "sendOnSessionUpdate").resolves();
  sandbox.stub(OneSignalUtils, "isUsingSubscriptionWorkaround").resolves(false);
  
  OneSignal.config.userConfig.promptOptions.autoPrompt = true;
  await InitHelper.onSdkInitialized();
  t.true(spy.notCalled);
});
