import test from "ava";
import { TestEnvironment, HttpHttpsEnvironment } from "../../support/sdk/TestEnvironment";
import { NotificationPermission } from "../../../src/models/NotificationPermission";
import { setupFakePlayerId } from "../../support/tester/utils";
import { NockOneSignalHelper } from "../../support/tester/NockOneSignalHelper";
import ServiceWorkerHelper from "../../../src/helpers/ServiceWorkerHelper";
import { initializeNewSession, Session, SessionOrigin } from "../../../src/models/Session";
import { PushDeviceRecord } from "../../../src/models/PushDeviceRecord";
import { DeliveryPlatformKind } from "../../../src/models/DeliveryPlatformKind";
import Database from "../../../src/services/Database";

test.beforeEach(async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https,
    permission: NotificationPermission.Granted
  });
  TestEnvironment.mockInternalOneSignal();
  await Database.put('Ids', { type: 'appId', id: OneSignal.context.appConfig.appId });
});

/**
 * START: SW on_session tests
 */

test("sendOnSessionCallIfNecessary, for push player", async t => {
  // 1. Create a push player id in the DB
  const pushPlayerId = await setupFakePlayerId();

  // 2. Setup a raw subscription, push record, and session
  const rawSubscription = TestEnvironment.getFakeRawPushSubscription();
  const pushDeviceRecord = new PushDeviceRecord(rawSubscription);
  pushDeviceRecord.appId = OneSignal.config.appId;
  const session: Session = initializeNewSession(
    { deviceId: pushPlayerId, appId: pushDeviceRecord.appId!, deviceType: DeliveryPlatformKind.ChromeLike }
  );

  // 3. Nock out push player on session before the network call is made.
  const onSessionNockPromise = NockOneSignalHelper.nockPlayerOnSession(pushPlayerId);

  // 4. Kick off on_session call
  await ServiceWorkerHelper.sendOnSessionCallIfNecessary(
    SessionOrigin.PlayerOnSession,
    pushDeviceRecord.serialize(),
    pushPlayerId,
    session
  );

  // 5. Ensure the correct params were sent in the network call.
  t.is((await onSessionNockPromise.result).request.url, `/api/v1/players/${pushPlayerId}/on_session`);
  t.deepEqual(
    (await onSessionNockPromise.result).request.body,
    {
      app_id: OneSignal.config.appId,
      device_model: '',
      device_os: -1,
      device_type: DeliveryPlatformKind.ChromeLike,
      language: 'en',
      identifier: rawSubscription.w3cEndpoint!.toString(),
      web_auth: rawSubscription.w3cAuth,
      web_p256: rawSubscription.w3cP256dh,
      sdk: '1',
      timezone: 0,
      timezone_id: 'UTC',
    }
  );
});

const TEST_EMAIL = "test@test.com";

test("sendOnSessionCallIfNecessary, for email player", async t => {
  // 1.1 Nock out email create
  const emailPostNock = NockOneSignalHelper.nockPlayerPost();
  await OneSignal.setEmail(TEST_EMAIL);
  const emailPlayerId = (await emailPostNock.result).response.body.id;
  // 1.2 Create a push player id in the DB
  const pushPlayerId = await setupFakePlayerId();

  // 2. Setup a raw subscription, push record, and session
  const rawSubscription = TestEnvironment.getFakeRawPushSubscription();
  const pushDeviceRecord = new PushDeviceRecord(rawSubscription);
  pushDeviceRecord.appId = OneSignal.config.appId;
  const session: Session = initializeNewSession(
    { deviceId: pushPlayerId, appId: pushDeviceRecord.appId!, deviceType: DeliveryPlatformKind.ChromeLike }
  );

  // 3.1 Nock out push player on session, not testing push in this test so ignore it.
  NockOneSignalHelper.nockPlayerOnSession(pushPlayerId);
  // 3.2 Nock out Email player on session before the network call is made.
  const onSessionNockPromise = NockOneSignalHelper.nockPlayerOnSession(emailPlayerId);

  // 4. Kick off on_session call.
  //    NOTE: This is ALWAYS expects a push player record by pre-existing design.
  await ServiceWorkerHelper.sendOnSessionCallIfNecessary(
    SessionOrigin.PlayerOnSession,
    pushDeviceRecord.serialize(),
    pushPlayerId,
    session
  );

  // 5. Ensure the correct params were sent in the network call.
  t.is((await onSessionNockPromise.result).request.url, `/api/v1/players/${emailPlayerId}/on_session`);
  t.deepEqual(
    (await onSessionNockPromise.result).request.body,
    {
      app_id: OneSignal.config.appId,
      device_model: '',
      device_os: -1,
      device_type: DeliveryPlatformKind.Email,
      language: 'en',
      identifier: TEST_EMAIL,
      sdk: '1',
      timezone: 0,
      timezone_id: 'UTC',
    }
  );
});

/**
 * END: SW on_session tests
 */

/**
 * START: SW on_focus tests
 */

 test("finalizeSession, for push player", async t => {
  // 1. Create a push player id in the DB
  const pushPlayerId = await setupFakePlayerId();

  // 2. Setup a push record and session
  const pushDeviceRecord = new PushDeviceRecord();
  pushDeviceRecord.appId = OneSignal.config.appId;
  const session = initializeNewSession(
    { deviceId: pushPlayerId, appId: pushDeviceRecord.appId!, deviceType: DeliveryPlatformKind.ChromeLike }
  );

  // 3. Nock out push player on_focus before the network call is made.
  const onSessionNockPromise = NockOneSignalHelper.nockPlayerOnFocus(pushPlayerId);

  // 4. Kick off on_focus call
  await ServiceWorkerHelper.finalizeSession(
    session,
    true,
    OneSignal.context.appConfig.userConfig.outcomes,
  );

  // 5. Ensure the correct url and params were sent in the network call.
  t.is((await onSessionNockPromise.result).request.url, `/api/v1/players/${pushPlayerId}/on_focus`);
  t.deepEqual(
    (await onSessionNockPromise.result).request.body,
    {
      app_id: OneSignal.config.appId,
      device_type: DeliveryPlatformKind.ChromeLike,
      state: 'ping',
      type: 1,
      active_time: 0,
    }
  );
});

test("finalizeSession, for email player", async t => {
  // 1.1 Nock out email create
  const emailPostNock = NockOneSignalHelper.nockPlayerPost();
  await OneSignal.setEmail(TEST_EMAIL);
  const emailPlayerId = (await emailPostNock.result).response.body.id;
  // 1.2 Create a push player id in the DB
  const pushPlayerId = await setupFakePlayerId();

  // 2. Setup a push record and session
  const pushDeviceRecord = new PushDeviceRecord();
  pushDeviceRecord.appId = OneSignal.config.appId;
  const session = initializeNewSession(
    { deviceId: pushPlayerId, appId: pushDeviceRecord.appId!, deviceType: DeliveryPlatformKind.ChromeLike }
  );

  // 3.1 Nock out push player on_focus, ignore.
  NockOneSignalHelper.nockPlayerOnFocus(pushPlayerId);
  // 3.2 Nock out email player on_focus before the network call is made.
  const onSessionNockPromise = NockOneSignalHelper.nockPlayerOnFocus(emailPlayerId);

  // 4. Kick off on_focus call
  //    NOTE: This is ALWAYS expects a push player session instance by pre-existing design.
  await ServiceWorkerHelper.finalizeSession(
    session,
    true,
    OneSignal.context.appConfig.userConfig.outcomes,
  );

  // 5. Ensure the correct url and params were sent in the network call.
  t.is((await onSessionNockPromise.result).request.url, `/api/v1/players/${emailPlayerId}/on_focus`);
  t.deepEqual(
    (await onSessionNockPromise.result).request.body,
    {
      app_id: OneSignal.config.appId,
      device_type: DeliveryPlatformKind.Email,
      state: 'ping',
      type: 1,
      active_time: 0,
    }
  );
});

/**
 * END: SW on_focus tests
 */

// const sessionThresholdInSeconds = 5;
// const sendOnFocusEnabled = true;
// // const deviceRecord = TODO
// const deviceId = Random.getRandomUuid();
// const sessionOrigin = SessionOrigin.PlayerOnSession;

// await ServiceWorkerHelper.upsertSession();

test.todo("upsertSession: if no existing session, insert");
test.todo(
  "upsertSession: if no existing session, send api call unless player create was invoked before"
);
test.todo(
  "upsertSession: if no existing session and on_session api call returned new player id, save it"
);
test.todo("upsertSession: if has existing session, reactivate if inactive");
test.todo("upsertSession: if has existing session, don't do anyting if invalid");

test.todo("deactivateSession: sets session as inactive and updates session duration");
test.todo("deactivateSession: sets timeout to finalize the session");

test.todo("finalizeSession: reports session duration to backend if flag enabled");
test.todo("finalizeSession: cleans up an existing session");

// test("on_session saves new player id if returned from onesignal.com", async t => {
//   // 1. Setup existing player id in indexDB
//   const playerId = Random.getRandomUuid();
//   const subscription = new Subscription();
//   subscription.deviceId = playerId;
//   await Database.setSubscription(subscription);

//   // 2. Mock on_session endpoint to give a new player_id
//   const newPlayerId = Random.getRandomUuid();
//   nock('https://onesignal.com')
//     .post("/api/v1/players/${playerId}/on_session")
//     .reply(200, { success: true, id: newPlayerId });

//   // 3. Make on_session call
//   sandbox.stub(OneSignal.context.sessionManager, "isFirstPageView").returns(true);
//   sandbox.stub(MainHelper, "getCurrentNotificationType").resolves(SubscriptionStateKind.Subscribed);
//   await OneSignal.context.updateManager.sendOnSessionUpdate();

//   // 4. Ensure we have the new playe_id saved in indexDB
//   const newSubscription = await Database.getSubscription();
//   t.is(newSubscription.deviceId, newPlayerId);
// });
