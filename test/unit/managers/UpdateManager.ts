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
import OneSignal from "../../../src/OneSignal"

// manually create and restore the sandbox
const sandbox: SinonSandbox = sinon.sandbox.create();

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
  sandbox.stub(Database, "getSubscription").resolves({ deviceId: undefined });
  const playerUpdateAPISpy = sandbox.stub(OneSignalApiShared, "updatePlayer");
  const onSessionSpy = sandbox.stub(OneSignal.context.updateManager, "sendOnSessionUpdate");

  await OneSignal.context.updateManager.sendPlayerUpdate();

  t.is(playerUpdateAPISpy.called, false);
  t.is(onSessionSpy.called, false);
});

test("sendPlayerUpdate sends on_session if on_session hasn't been sent before", async t => {
  sandbox.stub(Database, "getSubscription").resolves({ deviceId: Random.getRandomUuid() });
  const playerUpdateAPISpy = sandbox.stub(OneSignalApiShared, "updatePlayer");
  const onSessionSpy = sandbox.stub(OneSignal.context.updateManager, "sendOnSessionUpdate");

  t.is(OneSignal.context.updateManager.onSessionAlreadyCalled(), false);

  await OneSignal.context.updateManager.sendPlayerUpdate();

  t.is(playerUpdateAPISpy.called, false);
  t.is(onSessionSpy.calledOnce, true);
});

test("sendPlayerUpdate sends playerUpdate if on_session has already been sent", async t => {
  sandbox.stub(Database, "getSubscription").resolves({ deviceId: Random.getRandomUuid() });
  
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
  sandbox.stub(Database, "getSubscription").resolves({ deviceId: Random.getRandomUuid() });
  
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

test("sendOnSessionUpdate triggers on_session for existing subscribed user if hasn't done so already", async t => {
  sandbox.stub(Database, "getSubscription").resolves({ deviceId: Random.getRandomUuid() });
  sandbox.stub(OneSignal.context.sessionManager, "isFirstPageView").returns(true);
  sandbox.stub(OneSignal.context.subscriptionManager, "isAlreadyRegisteredWithOneSignal").resolves(true);
  sandbox.stub(MainHelper, "getCurrentNotificationType").resolves(SubscriptionStateKind.Subscribed);
  const onSessionSpy = sandbox.stub(OneSignalApiShared, "updateUserSession").resolves();

  t.is(OneSignal.context.updateManager.onSessionAlreadyCalled(), false);
  await OneSignal.context.updateManager.sendOnSessionUpdate();
  t.is(onSessionSpy.called, true);
  t.is(OneSignal.context.updateManager.onSessionAlreadyCalled(), true);
});

test("sendOnSessionUpdate triggers on_session for existing unsubscribed user if hasn't done so already and if enableOnSession flag is present", async t => {
  sandbox.stub(Database, "getSubscription").resolves({ deviceId: Random.getRandomUuid() });
  sandbox.stub(OneSignal.context.sessionManager, "isFirstPageView").returns(true);
  sandbox.stub(OneSignal.context.subscriptionManager, "isAlreadyRegisteredWithOneSignal").resolves(true);
  sandbox.stub(MainHelper, "getCurrentNotificationType").resolves(SubscriptionStateKind.MutedByApi);
  OneSignal.config.enableOnSession = true;

  const onSessionSpy = sandbox.stub(OneSignalApiShared, "updateUserSession").resolves();

  t.is(OneSignal.context.updateManager.onSessionAlreadyCalled(), false);
  await OneSignal.context.updateManager.sendOnSessionUpdate();
  t.is(onSessionSpy.called, true);
  t.is(OneSignal.context.updateManager.onSessionAlreadyCalled(), true);
});

test("sendOnSessionUpdate triggers on_session for existing unsubscribed user if hasn't done so already and if enableOnSession flag is not present", async t => {
  sandbox.stub(Database, "getSubscription").resolves({ deviceId: Random.getRandomUuid() });
  sandbox.stub(OneSignal.context.sessionManager, "isFirstPageView").returns(true);
  sandbox.stub(OneSignal.context.subscriptionManager, "isAlreadyRegisteredWithOneSignal").resolves(true);
  sandbox.stub(MainHelper, "getCurrentNotificationType").resolves(SubscriptionStateKind.MutedByApi);
  OneSignal.config.enableOnSession = false;

  const onSessionSpy = sandbox.stub(OneSignalApiShared, "updateUserSession").resolves();

  t.is(OneSignal.context.updateManager.onSessionAlreadyCalled(), false);
  await OneSignal.context.updateManager.sendOnSessionUpdate();
  t.is(onSessionSpy.called, false);
});

test("sendOnSessionUpdate includes appId at all times", async t => {
  const deviceId = Random.getRandomUuid();
  sandbox.stub(Database, "getSubscription").resolves({ deviceId });
  
  OneSignal.context.sessionManager.setPageViewCount(1);
  OneSignal.context.updateManager = new UpdateManager(OneSignal.context);
  t.is(OneSignal.context.updateManager.onSessionAlreadyCalled(), false);
  sandbox.stub(MainHelper, "getCurrentNotificationType").resolves(SubscriptionStateKind.Subscribed);

  const onSessionApiSpy = sandbox.stub(OneSignalApiShared, "updateUserSession").resolves();
  await OneSignal.context.updateManager.sendOnSessionUpdate();
  t.is(onSessionApiSpy.calledOnce, true);
  t.is(onSessionApiSpy.getCall(0).args.length, 2);
  t.is(onSessionApiSpy.getCall(0).args[0], deviceId);
  t.not(OneSignal.context.appConfig.appId, undefined);
  t.is(onSessionApiSpy.getCall(0).args[1].appId, OneSignal.context.appConfig.appId);
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

test("sendExternalUserIdUpdate makes an api call with the provided external user id", async t => {
  const deviceId = Random.getRandomUuid();
  const externalUserId = "external_email@example.com";
  
  sandbox.stub(OneSignal.context.updateManager, "getDeviceId").resolves(deviceId);
  const updatePlayerSpy = sandbox.stub(OneSignalApiShared, "updatePlayer");
  await OneSignal.context.updateManager.sendExternalUserIdUpdate(externalUserId);

  t.is(updatePlayerSpy.getCalls().length, 1);
  t.is(updatePlayerSpy.getCall(0).args[0], OneSignal.context.appConfig.appId);
  t.is(updatePlayerSpy.getCall(0).args[1], deviceId);
  t.is(updatePlayerSpy.getCall(0).args[2].hasOwnProperty("external_user_id"), true);
  t.is(updatePlayerSpy.getCall(0).args[2].external_user_id, externalUserId);

  await OneSignal.context.updateManager.sendExternalUserIdUpdate(undefined);

  t.is(updatePlayerSpy.getCalls().length, 2);
  t.is(updatePlayerSpy.getCall(1).args[0], OneSignal.context.appConfig.appId);
  t.is(updatePlayerSpy.getCall(1).args[1], deviceId);
  t.is(updatePlayerSpy.getCall(1).args[2].hasOwnProperty("external_user_id"), true);
  t.is(updatePlayerSpy.getCall(1).args[2].external_user_id, "");

  await OneSignal.context.updateManager.sendExternalUserIdUpdate(null);

  t.is(updatePlayerSpy.getCalls().length, 3);
  t.is(updatePlayerSpy.getCall(2).args[0], OneSignal.context.appConfig.appId);
  t.is(updatePlayerSpy.getCall(2).args[1], deviceId);
  t.is(updatePlayerSpy.getCall(2).args[2].hasOwnProperty("external_user_id"), true);
  t.is(updatePlayerSpy.getCall(2).args[2].external_user_id, "");
});
