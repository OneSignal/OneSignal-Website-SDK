import test from "ava";
import sinon, { SinonSandbox } from "sinon";
import { TestEnvironment, HttpHttpsEnvironment } from "../../support/sdk/TestEnvironment";
import { UpdateManager } from "../../../src/managers/UpdateManager";
import Database from "../../../src/services/Database";
import Random from "../../support/tester/Random";
import OneSignalApiShared from "../../../src/OneSignalApiShared";
import MainHelper from "../../../src/helpers/MainHelper";
import { SubscriptionStateKind } from "../../../src/models/SubscriptionStateKind";
import { PushDeviceRecord } from "../../../src/models/PushDeviceRecord";

// manually create and restore the sandbox
const sandbox: SinonSandbox = sinon.sandbox.create();;

test.beforeEach(async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });
  TestEnvironment.mockInternalOneSignal();
});

test.afterEach(function () {
  sandbox.restore();
});

test("sendPlayerUpdate doesn't do anything for new users", async t => {
  sandbox.stub(Database, "getSubscription").resolves({deviceId: undefined});
  const playerUpdateAPISpy = sandbox.stub(OneSignalApiShared, "updatePlayer");
  const onSessionSpy = sandbox.stub(OneSignal.context.updateManager, "sendOnSessionUpdate");

  await OneSignal.context.updateManager.sendPlayerUpdate();

  t.is(playerUpdateAPISpy.called, false);
  t.is(onSessionSpy.called, false);
});

test("sendPlayerUpdate sends on_session if on_session hasn't been sent before", async t => {
  sandbox.stub(Database, "getSubscription").resolves({deviceId: Random.getRandomUuid()});
  const playerUpdateAPISpy = sandbox.stub(OneSignalApiShared, "updatePlayer");
  const onSessionSpy = sandbox.stub(OneSignal.context.updateManager, "sendOnSessionUpdate");

  t.is(OneSignal.context.updateManager.onSessionAlreadyCalled(), false);

  await OneSignal.context.updateManager.sendPlayerUpdate();

  t.is(playerUpdateAPISpy.called, false);
  t.is(onSessionSpy.calledOnce, true);
});

test("sendPlayerUpdate sends playerUpdate if on_session has already been sent", async t => {
  sandbox.stub(Database, "getSubscription").resolves({deviceId: Random.getRandomUuid()});
  
  OneSignal.context.sessionManager.setPageViewCount(2);
  OneSignal.context.updateManager = new UpdateManager(OneSignal.context);

  t.is(OneSignal.context.updateManager.onSessionAlreadyCalled(), true);

  const playerUpdateAPISpy = sandbox.stub(OneSignalApiShared, "updatePlayer").resolves();
  const onSessionSpy = sandbox.stub(OneSignal.context.updateManager, "sendOnSessionUpdate").resolves();

  await OneSignal.context.updateManager.sendPlayerUpdate();

  t.is(playerUpdateAPISpy.calledOnce, true);
  t.is(onSessionSpy.called, false);
});

test("sendOnSessionUpdate doesn't trigger on_session call if already did so", async t => {
  sandbox.stub(Database, "getSubscription").resolves({deviceId: Random.getRandomUuid()});
  
  OneSignal.context.sessionManager.setPageViewCount(2);
  OneSignal.context.updateManager = new UpdateManager(OneSignal.context);
  const onSessionSpy = sandbox.stub(OneSignalApiShared, "updateUserSession");

  t.is(OneSignal.context.updateManager.onSessionAlreadyCalled(), true);
  await OneSignal.context.updateManager.sendOnSessionUpdate();
  t.is(onSessionSpy.called, false);
});

test("sendOnSessionUpdate doesn't trigger for a new user", async t => {
  sandbox.stub(Database, "getSubscription").resolves({deviceId: undefined});
  const onSessionSpy = sandbox.stub(OneSignalApiShared, "updateUserSession");

  t.is(OneSignal.context.updateManager.onSessionAlreadyCalled(), false);
  await OneSignal.context.updateManager.sendOnSessionUpdate();
  t.is(onSessionSpy.called, false);
});

test("sendOnSessionUpdate triggers on_session for existing user if hasn't done so already", async t => {
  sandbox.stub(Database, "getSubscription").resolves({deviceId: Random.getRandomUuid()});
  sandbox.stub(OneSignal.context.sessionManager, "isFirstPageView").returns(true);
  sandbox.stub(OneSignal.context.subscriptionManager, "isAlreadyRegisteredWithOneSignal").resolves(true);
  sandbox.stub(MainHelper, "getCurrentNotificationType").resolves(SubscriptionStateKind.Subscribed);
  const onSessionSpy = sandbox.stub(OneSignalApiShared, "updateUserSession").resolves();

  t.is(OneSignal.context.updateManager.onSessionAlreadyCalled(), false);
  await OneSignal.context.updateManager.sendOnSessionUpdate();
  t.is(onSessionSpy.called, true);
  t.is(OneSignal.context.updateManager.onSessionAlreadyCalled(), true);
});

test("sendPlayerCreate returns user id", async t => {
  const onCreateSpy = sandbox.stub(OneSignalApiShared, "createUser").resolves(Random.getRandomUuid());

  const deviceRecord = new PushDeviceRecord();
  deviceRecord.subscriptionState = SubscriptionStateKind.Subscribed;

  t.is(OneSignal.context.updateManager.onSessionAlreadyCalled(), false);
  await OneSignal.context.updateManager.sendPlayerCreate(deviceRecord);
  t.is(onCreateSpy.called, true);
  t.is(OneSignal.context.updateManager.onSessionAlreadyCalled(), true);
});
