import test from "ava";
import sinon, { SinonSandbox } from "sinon";
import { TestEnvironment, HttpHttpsEnvironment } from "../../support/sdk/TestEnvironment";
import { UpdateManager } from "../../../src/shared/managers/UpdateManager";
import Database from "../../../src/shared/services/Database";
import Random from "../../support/tester/Random";
import { SubscriptionStateKind } from "../../../src/shared/models/SubscriptionStateKind";
import { PushDeviceRecord } from "../../../src/shared/models/PushDeviceRecord";
import { NotificationPermission } from "../../../src/shared/models/NotificationPermission";
import {
  markUserAsSubscribed, stubServiceWorkerInstallation
} from "../../support/tester/sinonSandboxUtils";
import { DeviceRecord } from "../../../src/shared/models/DeviceRecord";
import OneSignalApiShared from "../../../src/shared/api/OneSignalApiShared";
import MainHelper from "../../../src/shared/helpers/MainHelper";

// manually create and restore the sandbox
const sandbox: SinonSandbox = sinon.sandbox.create();

test.beforeEach(async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https,
    permission: NotificationPermission.Granted
  });
  TestEnvironment.mockInternalOneSignal();
});

test.afterEach(function () {
  sandbox.restore();
});

test("sendPushDeviceRecordUpdate doesn't do anything for new users", async t => {
  sandbox.stub(Database, "getSubscription").resolves({ deviceId: undefined });
  const playerUpdateAPISpy = sandbox.stub(OneSignalApiShared, "updatePlayer");
  const onSessionSpy = sandbox.stub(OneSignal.context.sessionManager, "upsertSession");

  await OneSignal.context.updateManager.sendPushDeviceRecordUpdate();

  t.is(playerUpdateAPISpy.called, false);
  t.is(onSessionSpy.called, false);
});

test("sendPushDeviceRecordUpdate sends on_session if on_session hasn't been sent before", async t => {
  markUserAsSubscribed(sandbox);
  stubServiceWorkerInstallation(sandbox);

  // TODO: double-check why this line was not needed before. return 0 for page view count without it
  sandbox.stub(OneSignal.context.pageViewManager, "getPageViewCount").returns(1);

  const playerUpdateAPISpy = sandbox.stub(OneSignalApiShared, "updatePlayer");
  const onSessionSpy = sandbox.stub(OneSignal.context.sessionManager, "upsertSession").resolves();

  t.is(OneSignal.context.updateManager.onSessionAlreadyCalled(), false);

  await OneSignal.context.updateManager.sendPushDeviceRecordUpdate();

  t.is(playerUpdateAPISpy.called, false);
  t.is(onSessionSpy.callCount, 1);
});

test("sendPushDeviceRecordUpdate sends playerUpdate if on_session has already been sent", async t => {
  sandbox.stub(Database, "getSubscription").resolves({ deviceId: Random.getRandomUuid() });

  OneSignal.context.pageViewManager.setPageViewCount(2);
  OneSignal.context.updateManager = new UpdateManager(OneSignal.context);

  t.is(OneSignal.context.updateManager.onSessionAlreadyCalled(), true);

  const playerUpdateAPISpy = sandbox.stub(OneSignalApiShared, "updatePlayer").resolves();
  const onSessionSpy = sandbox.stub(OneSignal.context.sessionManager, "upsertSession").resolves();

  await OneSignal.context.updateManager.sendPushDeviceRecordUpdate();

  t.is(playerUpdateAPISpy.calledOnce, true);
  t.is(onSessionSpy.called, false);
});

test("sendOnSessionUpdate doesn't trigger on_session call if already did so", async t => {
  sandbox.stub(Database, "getSubscription").resolves({ deviceId: Random.getRandomUuid() });

  OneSignal.context.pageViewManager.setPageViewCount(2);
  OneSignal.context.updateManager = new UpdateManager(OneSignal.context);
  const onSessionSpy = sandbox.stub(OneSignal.context.sessionManager, "upsertSession");

  t.is(OneSignal.context.updateManager.onSessionAlreadyCalled(), true);
  await OneSignal.context.updateManager.sendOnSessionUpdate();
  t.is(onSessionSpy.called, false);
});

test("sendOnSessionUpdate doesn't trigger for a new user", async t => {
  sandbox.stub(Database, "getSubscription").resolves({ deviceId: undefined });
  const onSessionSpy = sandbox.stub(OneSignal.context.sessionManager, "upsertSession");

  t.is(OneSignal.context.updateManager.onSessionAlreadyCalled(), false);
  await OneSignal.context.updateManager.sendOnSessionUpdate();
  t.is(onSessionSpy.called, false);
});

test("sendOnSessionUpdate triggers on_session for existing subscribed user if hasn't done so already", async t => {
  sandbox.stub(Database, "getSubscription").resolves({ deviceId: Random.getRandomUuid() });
  sandbox.stub(OneSignal.context.pageViewManager, "isFirstPageView").returns(true);
  sandbox.stub(OneSignal.context.subscriptionManager, "isAlreadyRegisteredWithOneSignal").resolves(true);
  sandbox.stub(MainHelper, "getCurrentNotificationType").resolves(SubscriptionStateKind.Subscribed);
  const onSessionSpy = sandbox.stub(OneSignal.context.sessionManager, "upsertSession").resolves();

  t.is(OneSignal.context.updateManager.onSessionAlreadyCalled(), false);
  await OneSignal.context.updateManager.sendOnSessionUpdate();
  t.is(onSessionSpy.called, true);
  t.is(OneSignal.context.updateManager.onSessionAlreadyCalled(), true);
});

// TODO: needs to be moved into ServiceWorkerHelper tests
// test("on_session saves new player id if returned from onesignal.com", async t => {
//   // 1. Setup existing player id in indexDB
//   const playerId = Random.getRandomUuid();
//   const subscription = new Subscription();
//   subscription.deviceId = playerId;
//   await Database.setSubscription(subscription);

//   // 2. Mock on_session endpoint to give a new player_id
//   const newPlayerId = Random.getRandomUuid();
//   nock('https://onesignal.com')
//    .post(`/api/v1/players/${playerId}/on_session`)
//    .reply(200, { success: true, id: newPlayerId });

//   // 3. Make on_session call
//   sandbox.stub(OneSignal.context.sessionManager, "isFirstPageView").returns(true);
//   sandbox.stub(MainHelper, "getCurrentNotificationType").resolves(SubscriptionStateKind.Subscribed);
//   await OneSignal.context.updateManager.sendOnSessionUpdate();

//   // 4. Ensure we have the new playe_id saved in indexDB
//   const newSubscription = await Database.getSubscription();
//   t.is(newSubscription.deviceId, newPlayerId);
// });

test("sendOnSessionUpdate triggers on_session for existing unsubscribed user if hasn't done so already and if enableOnSession flag is present", async t => {
  sandbox.stub(Database, "getSubscription").resolves({ deviceId: Random.getRandomUuid() });
  sandbox.stub(OneSignal.context.pageViewManager, "isFirstPageView").returns(true);
  sandbox.stub(OneSignal.context.subscriptionManager, "isAlreadyRegisteredWithOneSignal").resolves(true);
  sandbox.stub(MainHelper, "getCurrentNotificationType").resolves(SubscriptionStateKind.MutedByApi);
  OneSignal.config.enableOnSession = true;

  const onSessionSpy = sandbox.stub(OneSignal.context.sessionManager, "upsertSession").resolves();

  t.is(OneSignal.context.updateManager.onSessionAlreadyCalled(), false);
  await OneSignal.context.updateManager.sendOnSessionUpdate();
  t.is(onSessionSpy.called, true);
  t.is(OneSignal.context.updateManager.onSessionAlreadyCalled(), true);
});

test(
  `sendOnSessionUpdate triggers on_session for existing unsubscribed user if hasn't done so
  already and if enableOnSession flag is not present`, async t => {
  sandbox.stub(Database, "getSubscription").resolves({ deviceId: Random.getRandomUuid() });
  sandbox.stub(OneSignal.context.pageViewManager, "isFirstPageView").returns(true);
  sandbox.stub(OneSignal.context.subscriptionManager, "isAlreadyRegisteredWithOneSignal").resolves(true);
  sandbox.stub(MainHelper, "getCurrentNotificationType").resolves(SubscriptionStateKind.MutedByApi);
  OneSignal.config.enableOnSession = false;

  const onSessionSpy = sandbox.stub(OneSignal.context.sessionManager, "upsertSession").resolves();

  t.is(OneSignal.context.updateManager.onSessionAlreadyCalled(), false);
  await OneSignal.context.updateManager.sendOnSessionUpdate();
  t.is(onSessionSpy.called, false);
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

test("sendPlayerCreate, includes external_user_id when calling createUser", async t => {
  const EXTERNAL_USER_ID_TEST_VALUE = '1234';
  sandbox.stub(Database, "getExternalUserId").resolves(EXTERNAL_USER_ID_TEST_VALUE);
  const onCreateSpy = sandbox.stub(OneSignalApiShared, "createUser").resolves(Random.getRandomUuid());

  await OneSignal.context.updateManager.sendPlayerCreate(new PushDeviceRecord());

  const deviceRecordSet: DeviceRecord = onCreateSpy.getCall(0).args[0];
  t.is(deviceRecordSet.externalUserId, EXTERNAL_USER_ID_TEST_VALUE);
});

test("sendExternalUserIdUpdate makes an api call with the provided external user id", async t => {
  const deviceId = Random.getRandomUuid();
  const externalUserId = "external_email@example.com";

  sandbox.stub(Database, "getSubscription").resolves({ deviceId });
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
