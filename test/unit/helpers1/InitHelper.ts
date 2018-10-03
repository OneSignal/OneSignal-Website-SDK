import test from "ava";
import sinon, { SinonSandbox } from 'sinon';

import InitHelper from "../../../src/helpers/InitHelper";
import OneSignal from "../../../src/OneSignal";
import OneSignalApiShared from "../../../src/OneSignalApiShared";
import Database from "../../../src/services/Database";
import MainHelper from "../../../src/helpers/MainHelper";
import { Subscription } from "../../../src/models/Subscription";
import { SubscriptionStateKind } from "../../../src/models/SubscriptionStateKind";
import Random from "../../support/tester/Random";
import { TestEnvironment, HttpHttpsEnvironment } from '../../support/sdk/TestEnvironment';
import { PushDeviceRecord } from '../../../src/models/PushDeviceRecord';
import Log from '../../../src/libraries/Log';

const testDeviceId = Random.getRandomUuid();
let sinonSandbox: SinonSandbox;

test.beforeEach(async () => {
  sinonSandbox = sinon.sandbox.create();
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });

  // Required for sessionContext, not async
  TestEnvironment.mockInternalOneSignal();
});

test.afterEach(function (_t: TestContext) {
  sinonSandbox.restore();
});

/**
 * on_session
 */
test("doesn't send on_session if enable flag not set for https", async t => {
  OneSignal.context.appConfig.enableOnSession = false;
  const apiSpy = sinonSandbox.spy(OneSignalApiShared, "updateUserSession");
  await InitHelper.sendOnSessionUpdate();
  t.is(apiSpy.notCalled, true);
});

test("doesn't send on_session if enable flag not set for http and not subscribed", async t => {
  sinonSandbox.restore();
  sinonSandbox = sinon.sandbox.create();
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Http
  });

  // Required for sessionContext, not async
  TestEnvironment.mockInternalOneSignal();

  OneSignal.context.appConfig.enableOnSession = false;
  sinonSandbox.stub(MainHelper, "getCurrentNotificationType").resolves(SubscriptionStateKind.MutedByApi);

  const apiSpy = sinonSandbox.spy(OneSignalApiShared, "updateUserSession");
  await InitHelper.sendOnSessionUpdate();
  t.is(apiSpy.notCalled, true);
});

test("send on_session if enable flag not set for http and subscribed", async t => {
  sinonSandbox.restore();
  sinonSandbox = sinon.sandbox.create();
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Http
  });

  // Required for sessionContext, not async
  TestEnvironment.mockInternalOneSignal();

  OneSignal.context.appConfig.enableOnSession = false;
  await testUpdateSessionForSuscriptionState(t, SubscriptionStateKind.Subscribed);
});

test("doesn't send on_session if not first page view", async t => {
  sinonSandbox.stub(OneSignal.context.sessionManager, "isFirstPageView").returns(false);
  const apiSpy = sinonSandbox.spy(OneSignalApiShared, "updateUserSession");
  await InitHelper.sendOnSessionUpdate();
  t.is(apiSpy.notCalled, true);
});

test("doesn't send on_session if never registered before", async t => {
  sinonSandbox.stub(OneSignal.context.sessionManager, "isFirstPageView").returns(true);
  sinonSandbox.stub(Database, "getSubscription").returns({} as Subscription);
  
  const apiSpy = sinonSandbox.spy(OneSignalApiShared, "updateUserSession");
  await InitHelper.sendOnSessionUpdate();
  t.is(apiSpy.notCalled, true);
});

test("sends on_session for subscribed", async t => {
  await testUpdateSessionForSuscriptionState(t, SubscriptionStateKind.Subscribed);
});

test("sends on_session for opted out", async t => {
  await testUpdateSessionForSuscriptionState(t, SubscriptionStateKind.MutedByApi);
});

test("sends on_session for native notification permission blocked", async t => {
  await testUpdateSessionForSuscriptionState(t, SubscriptionStateKind.PushSubscriptionRevoked);
});

test("sends on_session for native notification permission set to default", async t => {
  await testUpdateSessionForSuscriptionState(t, SubscriptionStateKind.Default);
});

test("safely recover from failed on_session call and log error", async t => {
  sinonSandbox.stub(OneSignal.context.sessionManager, "isFirstPageView").returns(true);
  sinonSandbox.stub(Database, "getSubscription").returns({deviceId: testDeviceId} as Subscription);
  sinonSandbox.stub(MainHelper, "getCurrentNotificationType").resolves(SubscriptionStateKind.Subscribed);

  const apiSpy = sinonSandbox.stub(OneSignalApiShared, "updateUserSession").rejects(new Error("Network error"));
  const logSpy = sinonSandbox.stub(Log, "error").resolves();
  await InitHelper.sendOnSessionUpdate();
  t.is(apiSpy.calledOnce, true);
  t.is(logSpy.calledOnce, true);
});



// private
const testUpdateSessionForSuscriptionState = async function(t: any, subscriptionState: SubscriptionStateKind) {
  sinonSandbox.stub(OneSignal.context.sessionManager, "isFirstPageView").returns(true);
  sinonSandbox.stub(Database, "getSubscription").returns({deviceId: testDeviceId} as Subscription);
  sinonSandbox.stub(MainHelper, "getCurrentNotificationType").resolves(subscriptionState);
  const apiSpy = sinonSandbox.stub(OneSignalApiShared, "updateUserSession").resolves(testDeviceId);
  await InitHelper.sendOnSessionUpdate();
  t.is(apiSpy.calledOnce, true);

  const callArgs = apiSpy.getCall(0).args
  t.is(callArgs.length, 2);
  t.is(callArgs[0], testDeviceId);
  t.is((callArgs[1] as PushDeviceRecord).subscriptionState, subscriptionState);
}
