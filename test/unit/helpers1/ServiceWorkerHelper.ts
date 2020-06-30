import test from "ava";
import sinon, { SinonSandbox } from "sinon";
import { TestEnvironment, HttpHttpsEnvironment } from "../../support/sdk/TestEnvironment";
import { NotificationPermission } from "../../../src/models/NotificationPermission";
import ServiceWorkerHelper from "../../../src/helpers/ServiceWorkerHelper";
import Random from "../../support/tester/Random";
import { SessionOrigin } from "../../../src/models/Session";

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
test.todo("upsertSession: if has existing session, reactivate if inactive");

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