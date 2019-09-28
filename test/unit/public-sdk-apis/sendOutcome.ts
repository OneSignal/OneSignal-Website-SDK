import test from "ava";
import OneSignal from "../../../src/OneSignal";
import sinon, { SinonSandbox } from "sinon";
import { TestEnvironment } from "../../support/sdk/TestEnvironment";
import OneSignalApiShared from "../../../src/OneSignalApiShared";
import { OutcomeRequestData } from "../../../src/models/OutcomeRequestData";
import { DeliveryPlatformKind } from "../../../src/models/DeliveryPlatformKind";
import { SubscriptionStateKind } from "../../../src/models/SubscriptionStateKind";
import MainHelper from "../../../src/helpers/MainHelper";
import Log from "../../../src/libraries/Log";
import Database from "../../../src/services/Database";
import { NotificationReceived, NotificationClicked } from "../../../src/models/Notification";
import Random from "../../support/tester/Random";
import timemachine from "timemachine";

const OUTCOME_NAME = "test_outcome";
const OUTCOME_WEIGHT = 55.6;

const sinonSandbox: SinonSandbox = sinon.sandbox.create();

test.beforeEach(async () => {
  await TestEnvironment.initialize();
  TestEnvironment.mockInternalOneSignal();

  const now = new Date().getTime();
  timemachine.config({
    timestamp: now,
  });
});

test.afterEach(() => {
  sinonSandbox.restore();
  timemachine.reset();
});

test("outcome name is required", async t => {
  const logSpy = sinonSandbox.stub(Log, "error");
  const apiSpy = sinonSandbox.stub(OneSignalApiShared, "sendOutcome").resolves();
  await (OneSignal as any).sendOutcome();
  t.is(logSpy.callCount, 1);
  t.is(apiSpy.callCount, 0);
});

test("outcome weight cannot be other than number or undefined", async t => {
  const logSpy = sinonSandbox.stub(Log, "error");
  const apiSpy = sinonSandbox.stub(OneSignalApiShared, "sendOutcome").resolves();
  await (OneSignal as any).sendOutcome(OUTCOME_NAME, {});
  t.is(logSpy.callCount, 1);
  t.is(apiSpy.callCount, 0);
});

test("reporting outcome requires the sdk to be initialized", async t => {
  OneSignal.initialized = false;

  const apiSpy = sinonSandbox.stub(OneSignalApiShared, "sendOutcome").resolves();
  sinonSandbox.stub(OneSignal, "privateIsPushNotificationsEnabled").resolves(true);
  sinonSandbox.stub(MainHelper, "getCurrentNotificationType").resolves(SubscriptionStateKind.Subscribed);
  const sendOutcomePromise = OneSignal.sendOutcome(OUTCOME_NAME);
  t.is(apiSpy.callCount, 0);

  OneSignal.emitter.emit(OneSignal.EVENTS.SDK_INITIALIZED);
  await sendOutcomePromise;

  t.is(apiSpy.callCount, 1);
});

test("reporting outcome should only work for subscribed users", async t => {
  const apiSpy = sinonSandbox.stub(OneSignalApiShared, "sendOutcome").resolves();
  sinonSandbox.stub(OneSignal, "privateIsPushNotificationsEnabled").resolves(false);
  await OneSignal.sendOutcome(OUTCOME_NAME);
  t.is(apiSpy.callCount, 0);
});

test("when outcome is unattributed and feature enabled it sends an api call",  async t => {
  const apiSpy = sinonSandbox.stub(OneSignalApiShared, "sendOutcome").resolves();
  sinonSandbox.stub(OneSignal, "privateIsPushNotificationsEnabled").resolves(true);
  sinonSandbox.stub(MainHelper, "getCurrentNotificationType").resolves(SubscriptionStateKind.Subscribed);
  await OneSignal.sendOutcome(OUTCOME_NAME);

  t.is(apiSpy.callCount, 1);
  const outcomeRequestData = apiSpy.getCall(0).args[0] as OutcomeRequestData;
  t.is(outcomeRequestData.app_id, OneSignal.config!.appId!);
  t.is(outcomeRequestData.id, OUTCOME_NAME);
  t.is(outcomeRequestData.weight, undefined);
  t.is(outcomeRequestData.notification_ids, undefined);
  t.is(outcomeRequestData.device_type, DeliveryPlatformKind.ChromeLike);
});

test("when outcome is unattributed and feature disabled there are no api calls",  async t => {
  OneSignal.config!.userConfig.outcomes!.unattributed.enabled = false;

  const apiSpy = sinonSandbox.stub(OneSignalApiShared, "sendOutcome");
  await OneSignal.sendOutcome(OUTCOME_NAME);

  t.is(apiSpy.callCount, 0);
});

test("when outcome is unattributed and feature enabled and has weight it sends an api call",  async t => {
  const apiSpy = sinonSandbox.stub(OneSignalApiShared, "sendOutcome").resolves();
  sinonSandbox.stub(OneSignal, "privateIsPushNotificationsEnabled").resolves(true);
  sinonSandbox.stub(MainHelper, "getCurrentNotificationType").resolves(SubscriptionStateKind.Subscribed);
  await OneSignal.sendOutcome(OUTCOME_NAME, OUTCOME_WEIGHT);

  t.is(apiSpy.callCount, 1);
  const outcomeRequestData = apiSpy.getCall(0).args[0] as OutcomeRequestData;
  t.is(outcomeRequestData.app_id, OneSignal.config!.appId!);
  t.is(outcomeRequestData.id, OUTCOME_NAME);
  t.is(outcomeRequestData.weight, OUTCOME_WEIGHT);
  t.is(outcomeRequestData.notification_ids, undefined);
  t.is(outcomeRequestData.device_type, DeliveryPlatformKind.ChromeLike);
  t.is(outcomeRequestData.direct, undefined);
});

test("when outcome is direct and feature enabled it sends an api call", async t => {
  const notificationClicked: NotificationClicked = {
    notificationId: Random.getRandomUuid(),
    appId: OneSignal.config!.appId!,
    url: "https://localhost:3001",
    timestamp: new Date().getTime().toString(),
  }
  await Database.put("NotificationClicked", notificationClicked);
  const apiSpy = sinonSandbox.stub(OneSignalApiShared, "sendOutcome").resolves();
  sinonSandbox.stub(OneSignal, "privateIsPushNotificationsEnabled").resolves(true);
  sinonSandbox.stub(MainHelper, "getCurrentNotificationType").resolves(SubscriptionStateKind.Subscribed);
  await OneSignal.sendOutcome(OUTCOME_NAME);

  t.is(apiSpy.callCount, 1);
  const outcomeRequestData = apiSpy.getCall(0).args[0] as OutcomeRequestData;
  t.is(outcomeRequestData.id, OUTCOME_NAME);
  t.is(outcomeRequestData.app_id, OneSignal.config!.userConfig.appId!);
  t.is(outcomeRequestData.weight, undefined);
  t.is(outcomeRequestData.notification_ids!.length, 1);
  t.is(outcomeRequestData.notification_ids![0], notificationClicked.notificationId);
  t.is(outcomeRequestData.device_type, DeliveryPlatformKind.ChromeLike);
  t.is(outcomeRequestData.direct, true);
});

test("when outcome is direct and feature disabled there are no api calls", async t => {
  OneSignal.config!.userConfig.outcomes!.direct.enabled = false;
  OneSignal.config!.userConfig.outcomes!.indirect.enabled = false;
  OneSignal.config!.userConfig.outcomes!.unattributed.enabled = false;

  const notificationClicked: NotificationClicked = {
    notificationId: Random.getRandomUuid(),
    appId: OneSignal.config!.appId!,
    url: "https://localhost:3001",
    timestamp: new Date().getTime().toString(),
  }
  await Database.put("NotificationClicked", notificationClicked);
  const apiSpy = sinonSandbox.stub(OneSignalApiShared, "sendOutcome").resolves();
  sinonSandbox.stub(OneSignal, "privateIsPushNotificationsEnabled").resolves(true);
  sinonSandbox.stub(MainHelper, "getCurrentNotificationType").resolves(SubscriptionStateKind.Subscribed);
  await OneSignal.sendOutcome(OUTCOME_NAME);

  t.is(apiSpy.callCount, 0);
});

test("when outcome is direct and feature enabled and has weight it sends an api call", async t => {
  const notificationClicked: NotificationClicked = {
    notificationId: Random.getRandomUuid(),
    appId: OneSignal.config!.appId!,
    url: "https://localhost:3001",
    timestamp: new Date().getTime().toString(),
  }
  await Database.put("NotificationClicked", notificationClicked);
  const apiSpy = sinonSandbox.stub(OneSignalApiShared, "sendOutcome").resolves();
  sinonSandbox.stub(OneSignal, "privateIsPushNotificationsEnabled").resolves(true);
  sinonSandbox.stub(MainHelper, "getCurrentNotificationType").resolves(SubscriptionStateKind.Subscribed);
  await OneSignal.sendOutcome(OUTCOME_NAME, OUTCOME_WEIGHT);

  t.is(apiSpy.callCount, 1);
  const outcomeRequestData = apiSpy.getCall(0).args[0] as OutcomeRequestData;
  t.is(outcomeRequestData.id, OUTCOME_NAME);
  t.is(outcomeRequestData.app_id, OneSignal.config!.userConfig.appId!);
  t.is(outcomeRequestData.weight, OUTCOME_WEIGHT);
  t.is(outcomeRequestData.notification_ids!.length, 1);
  t.is(outcomeRequestData.notification_ids![0], notificationClicked.notificationId);
  t.is(outcomeRequestData.device_type, DeliveryPlatformKind.ChromeLike);
  t.is(outcomeRequestData.direct, true);
});

const TEN_MINUTES_MS = 10 * 60 * 1000;

const setupReceivedNotifications = async () => {
  const now = new Date().getTime();
  const timeframeMs = OneSignal.config!.userConfig.outcomes!.indirect.influencedTimePeriodMin * 60 * 1000;
  const beginningOfTimeframe = new Date(new Date().getTime() - timeframeMs);
  const maxTimestamp = beginningOfTimeframe.getTime().toString();
  const limit = OneSignal.config!.userConfig.outcomes!.indirect.influencedNotificationsLimit;

  const receivedNotificationIdsWithinTimeframe: string[] = [];
  for (let i = 0; i < limit + 3; i++) {
    const timestamp = new Date(now - i * TEN_MINUTES_MS).getTime().toString();
    const notificationReceived: NotificationReceived = {
      notificationId: Random.getRandomUuid(),
      appId: OneSignal.config!.appId!,
      url: "https://localhost:3001",
      timestamp,
    }
    if (notificationReceived.timestamp >= maxTimestamp && receivedNotificationIdsWithinTimeframe.length < limit) {
      receivedNotificationIdsWithinTimeframe.push(notificationReceived.notificationId);
    }
    await Database.put("NotificationReceived", notificationReceived);
  }

  return receivedNotificationIdsWithinTimeframe;
}

test("when outcome is indirect and feature enabled it sends an api call", async t => {
  const receivedNotificationIdsWithinTimeframe = await setupReceivedNotifications();

  const apiSpy = sinonSandbox.stub(OneSignalApiShared, "sendOutcome").resolves();
  sinonSandbox.stub(OneSignal, "privateIsPushNotificationsEnabled").resolves(true);
  sinonSandbox.stub(MainHelper, "getCurrentNotificationType").resolves(SubscriptionStateKind.Subscribed);
  await OneSignal.sendOutcome(OUTCOME_NAME);

  t.is(apiSpy.callCount, 1);
  const outcomeRequestData = apiSpy.getCall(0).args[0] as OutcomeRequestData;
  t.is(outcomeRequestData.id, OUTCOME_NAME);
  t.is(outcomeRequestData.app_id, OneSignal.config!.userConfig.appId!);
  t.is(outcomeRequestData.weight, undefined);
  t.is(outcomeRequestData.notification_ids!.length, receivedNotificationIdsWithinTimeframe.length);
  outcomeRequestData.notification_ids!.sort();
  receivedNotificationIdsWithinTimeframe.sort();
  t.deepEqual(outcomeRequestData.notification_ids!, receivedNotificationIdsWithinTimeframe);
  t.is(outcomeRequestData.device_type, DeliveryPlatformKind.ChromeLike);
  t.is(outcomeRequestData.direct, false);
});

test("when outcome is indirect and feature disabled there are no api calls", async t => {
  OneSignal.config!.userConfig.outcomes!.direct.enabled = false;
  OneSignal.config!.userConfig.outcomes!.indirect.enabled = false;
  OneSignal.config!.userConfig.outcomes!.unattributed.enabled = false;

  await setupReceivedNotifications();
  const apiSpy = sinonSandbox.stub(OneSignalApiShared, "sendOutcome").resolves();
  sinonSandbox.stub(OneSignal, "privateIsPushNotificationsEnabled").resolves(true);
  sinonSandbox.stub(MainHelper, "getCurrentNotificationType").resolves(SubscriptionStateKind.Subscribed);
  await OneSignal.sendOutcome(OUTCOME_NAME);

  t.is(apiSpy.callCount, 0);
});

test("when outcome is indirect and feature enabled and has weight it sends an api call", async t => {
  const receivedNotificationIdsWithinTimeframe = await setupReceivedNotifications();
  const apiSpy = sinonSandbox.stub(OneSignalApiShared, "sendOutcome").resolves();
  sinonSandbox.stub(OneSignal, "privateIsPushNotificationsEnabled").resolves(true);
  sinonSandbox.stub(MainHelper, "getCurrentNotificationType").resolves(SubscriptionStateKind.Subscribed);
  await OneSignal.sendOutcome(OUTCOME_NAME);

  t.is(apiSpy.callCount, 1);
  const outcomeRequestData = apiSpy.getCall(0).args[0] as OutcomeRequestData;
  t.is(outcomeRequestData.id, OUTCOME_NAME);
  t.is(outcomeRequestData.app_id, OneSignal.config!.userConfig.appId!);
  t.is(outcomeRequestData.weight, undefined);
  t.is(outcomeRequestData.notification_ids!.length, receivedNotificationIdsWithinTimeframe.length);
  t.deepEqual(outcomeRequestData.notification_ids!, receivedNotificationIdsWithinTimeframe);
  t.is(outcomeRequestData.device_type, DeliveryPlatformKind.ChromeLike);
  t.is(outcomeRequestData.direct, false);
});
