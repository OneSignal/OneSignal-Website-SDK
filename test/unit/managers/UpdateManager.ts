import test from 'ava';
import sinon, { SinonSandbox } from 'sinon';
import { TestEnvironment } from '../../support/sdk/TestEnvironment';
import { UpdateManager } from '../../../src/shared/managers/UpdateManager';
import Database from '../../../src/shared/services/Database';
import Random from '../../support/tester/Random';
import { NotificationPermission } from '../../../src/shared/models/NotificationPermission';

// manually create and restore the sandbox
const sandbox: SinonSandbox = sinon.sandbox.create();

test.beforeEach(async (t) => {
  await TestEnvironment.initialize({
    permission: NotificationPermission.Granted,
  });
  TestEnvironment.mockInternalOneSignal();
});

test.afterEach(function () {
  sandbox.restore();
});

test("sendOnSessionUpdate doesn't trigger on_session call if already did so", async (t) => {
  sandbox
    .stub(Database, 'getSubscription')
    .resolves({ deviceId: Random.getRandomUuid() });

  OneSignal.context.pageViewManager.setPageViewCount(2);
  OneSignal.context.updateManager = new UpdateManager(OneSignal.context);
  const onSessionSpy = sandbox.stub(
    OneSignal.context.sessionManager,
    'upsertSession',
  );

  t.is(OneSignal.context.updateManager.onSessionAlreadyCalled(), true);
  await OneSignal.context.updateManager.sendOnSessionUpdate();
  t.is(onSessionSpy.called, false);
});

test("sendOnSessionUpdate doesn't trigger for a new user", async (t) => {
  sandbox.stub(Database, 'getSubscription').resolves({ deviceId: undefined });
  const onSessionSpy = sandbox.stub(
    OneSignal.context.sessionManager,
    'upsertSession',
  );

  t.is(OneSignal.context.updateManager.onSessionAlreadyCalled(), false);
  await OneSignal.context.updateManager.sendOnSessionUpdate();
  t.is(onSessionSpy.called, false);
});

test("sendOnSessionUpdate triggers on_session for existing subscribed user if hasn't done so already", async (t) => {
  sandbox
    .stub(Database, 'getSubscription')
    .resolves({ deviceId: Random.getRandomUuid() });
  sandbox
    .stub(OneSignal.context.pageViewManager, 'isFirstPageView')
    .returns(true);
  sandbox
    .stub(
      OneSignal.context.subscriptionManager,
      'isAlreadyRegisteredWithOneSignal',
    )
    .resolves(true);
  const onSessionSpy = sandbox
    .stub(OneSignal.context.sessionManager, 'upsertSession')
    .resolves();

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
//   await OneSignal.context.updateManager.sendOnSessionUpdate();

//   // 4. Ensure we have the new playe_id saved in indexDB
//   const newSubscription = await Database.getSubscription();
//   t.is(newSubscription.deviceId, newPlayerId);
// });

test("sendOnSessionUpdate triggers on_session for existing unsubscribed user if hasn't done so already and if enableOnSession flag is present", async (t) => {
  sandbox
    .stub(Database, 'getSubscription')
    .resolves({ deviceId: Random.getRandomUuid() });
  sandbox
    .stub(OneSignal.context.pageViewManager, 'isFirstPageView')
    .returns(true);
  sandbox
    .stub(
      OneSignal.context.subscriptionManager,
      'isAlreadyRegisteredWithOneSignal',
    )
    .resolves(true);
  OneSignal.config.enableOnSession = true;

  const onSessionSpy = sandbox
    .stub(OneSignal.context.sessionManager, 'upsertSession')
    .resolves();

  t.is(OneSignal.context.updateManager.onSessionAlreadyCalled(), false);
  await OneSignal.context.updateManager.sendOnSessionUpdate();
  t.is(onSessionSpy.called, true);
  t.is(OneSignal.context.updateManager.onSessionAlreadyCalled(), true);
});

test(`sendOnSessionUpdate triggers on_session for existing unsubscribed user if hasn't done so
  already and if enableOnSession flag is not present`, async (t) => {
  sandbox
    .stub(Database, 'getSubscription')
    .resolves({ deviceId: Random.getRandomUuid() });
  sandbox
    .stub(OneSignal.context.pageViewManager, 'isFirstPageView')
    .returns(true);
  sandbox
    .stub(
      OneSignal.context.subscriptionManager,
      'isAlreadyRegisteredWithOneSignal',
    )
    .resolves(true);
  OneSignal.config.enableOnSession = false;

  const onSessionSpy = sandbox
    .stub(OneSignal.context.sessionManager, 'upsertSession')
    .resolves();

  t.is(OneSignal.context.updateManager.onSessionAlreadyCalled(), false);
  await OneSignal.context.updateManager.sendOnSessionUpdate();
  t.is(onSessionSpy.called, false);
});
