import test from "ava";
import _ from "lodash";
import sinon, { SinonSandbox } from "sinon";
import { TestEnvironment } from "../../support/sdk/TestEnvironment";
import { OutcomeRequestData } from "../../../src/page/models/OutcomeRequestData";
import { DeliveryPlatformKind } from "../../../src/shared/models/DeliveryPlatformKind";
import { SubscriptionStateKind } from "../../../src/shared/models/SubscriptionStateKind";
import Log from "../../../src/shared/libraries/Log";
import Database from "../../../src/shared/services/Database";
import timemachine from "timemachine";
import { SentUniqueOutcome } from '../../../src/shared/models/Outcomes';
import OutcomeTestHelper from '../../support/tester/OutcomeTestHelper';
import OneSignalApiShared from "../../../src/shared/api/OneSignalApiShared";
import MainHelper from "../../../src/shared/helpers/MainHelper";
import OneSignalPublic from "../../../src/onesignal/OneSignalPublic";

const sinonSandbox: SinonSandbox = sinon.sandbox.create();
const OUTCOME_NAME = "test_outcome";

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
  await (OneSignalPublic as any).sendUniqueOutcome();
  t.is(logSpy.callCount, 1);
  t.is(apiSpy.callCount, 0);
});

test("reporting outcome requires the sdk to be initialized", async t => {
  OneSignalPublic.initialized = false;

  const apiSpy = sinonSandbox.stub(OneSignalApiShared, "sendOutcome").resolves();
  sinonSandbox.stub(OneSignalPublic, "privateIsPushNotificationsEnabled").resolves(true);
  sinonSandbox.stub(MainHelper, "getCurrentNotificationType").resolves(SubscriptionStateKind.Subscribed);
  const sendOutcomePromise = OneSignalPublic.sendUniqueOutcome(OUTCOME_NAME);
  t.is(apiSpy.callCount, 0);

  OneSignalPublic.emitter.emit(OneSignalPublic.EVENTS.SDK_INITIALIZED);
  await sendOutcomePromise;

  t.is(apiSpy.callCount, 1);
});

test("reporting outcome should only work for subscribed users", async t => {
  const apiSpy = sinonSandbox.stub(OneSignalApiShared, "sendOutcome").resolves();
  sinonSandbox.stub(OneSignalPublic, "privateIsPushNotificationsEnabled").resolves(false);
  await OneSignalPublic.sendUniqueOutcome(OUTCOME_NAME);
  t.is(apiSpy.callCount, 0);
});

test("when outcome is unattributed and feature enabled it sends an api call",  async t => {
  const apiSpy = sinonSandbox.stub(OneSignalApiShared, "sendOutcome").resolves();
  sinonSandbox.stub(OneSignalPublic, "privateIsPushNotificationsEnabled").resolves(true);
  sinonSandbox.stub(MainHelper, "getCurrentNotificationType").resolves(SubscriptionStateKind.Subscribed);
  await OneSignalPublic.sendUniqueOutcome(OUTCOME_NAME);

  t.is(apiSpy.callCount, 1);
  const outcomeRequestData = apiSpy.getCall(0).args[0] as OutcomeRequestData;
  t.is(outcomeRequestData.app_id, OneSignalPublic.config!.appId!);
  t.is(outcomeRequestData.id, OUTCOME_NAME);
  t.is(outcomeRequestData.weight, undefined);
  t.is(outcomeRequestData.notification_ids, undefined);
  t.is(outcomeRequestData.device_type, DeliveryPlatformKind.ChromeLike);
});

test("when outcome is unattributed and feature disabled there are no api calls",  async t => {
  OneSignalPublic.config!.userConfig.outcomes!.unattributed.enabled = false;

  const apiSpy = sinonSandbox.stub(OneSignalApiShared, "sendOutcome");
  await OneSignalPublic.sendUniqueOutcome(OUTCOME_NAME);

  t.is(apiSpy.callCount, 0);
});

test("when outcome is direct and feature enabled it sends an api call", async t => {
  const notificationClicked = OutcomeTestHelper.generateNotification();
  await Database.put("NotificationClicked", notificationClicked);
  const apiSpy = sinonSandbox.stub(OneSignalApiShared, "sendOutcome").resolves();
  sinonSandbox.stub(OneSignalPublic, "privateIsPushNotificationsEnabled").resolves(true);
  sinonSandbox.stub(MainHelper, "getCurrentNotificationType").resolves(SubscriptionStateKind.Subscribed);
  await OneSignalPublic.sendUniqueOutcome(OUTCOME_NAME);

  t.is(apiSpy.callCount, 1);
  const outcomeRequestData = apiSpy.getCall(0).args[0] as OutcomeRequestData;
  t.is(outcomeRequestData.id, OUTCOME_NAME);
  t.is(outcomeRequestData.app_id, OneSignalPublic.config!.userConfig.appId!);
  t.is(outcomeRequestData.notification_ids!.length, 1);
  t.is(outcomeRequestData.notification_ids![0], notificationClicked.notificationId);
  t.is(outcomeRequestData.device_type, DeliveryPlatformKind.ChromeLike);
  t.is(outcomeRequestData.direct, true);
});

test("when outcome is direct and feature disabled there are no api calls", async t => {
  OneSignalPublic.config!.userConfig.outcomes!.direct.enabled = false;
  OneSignalPublic.config!.userConfig.outcomes!.indirect.enabled = false;
  OneSignalPublic.config!.userConfig.outcomes!.unattributed.enabled = false;

  const notificationClicked = OutcomeTestHelper.generateNotification();
  await Database.put("NotificationClicked", notificationClicked);
  const apiSpy = sinonSandbox.stub(OneSignalApiShared, "sendOutcome").resolves();
  sinonSandbox.stub(OneSignalPublic, "privateIsPushNotificationsEnabled").resolves(true);
  sinonSandbox.stub(MainHelper, "getCurrentNotificationType").resolves(SubscriptionStateKind.Subscribed);
  await OneSignalPublic.sendUniqueOutcome(OUTCOME_NAME);

  t.is(apiSpy.callCount, 0);
});

test("when outcome is indirect and feature enabled it sends an api call", async t => {
  const receivedNotificationIdsWithinTimeframe = await OutcomeTestHelper.setupReceivedNotifications();

  const apiSpy = sinonSandbox.stub(OneSignalApiShared, "sendOutcome").resolves();
  sinonSandbox.stub(OneSignalPublic, "privateIsPushNotificationsEnabled").resolves(true);
  sinonSandbox.stub(MainHelper, "getCurrentNotificationType").resolves(SubscriptionStateKind.Subscribed);
  await OneSignalPublic.sendUniqueOutcome(OUTCOME_NAME);

  t.is(apiSpy.callCount, 1);
  const outcomeRequestData = apiSpy.getCall(0).args[0] as OutcomeRequestData;
  t.is(outcomeRequestData.id, OUTCOME_NAME);
  t.is(outcomeRequestData.app_id, OneSignalPublic.config!.userConfig.appId!);
  t.is(outcomeRequestData.notification_ids!.length, receivedNotificationIdsWithinTimeframe.length);
  outcomeRequestData.notification_ids!.sort();
  receivedNotificationIdsWithinTimeframe.sort();
  t.deepEqual(outcomeRequestData.notification_ids!, receivedNotificationIdsWithinTimeframe);
  t.is(outcomeRequestData.device_type, DeliveryPlatformKind.ChromeLike);
  t.is(outcomeRequestData.direct, false);
});

test("when outcome is indirect and feature disabled there are no api calls", async t => {
  OneSignalPublic.config!.userConfig.outcomes!.direct.enabled = false;
  OneSignalPublic.config!.userConfig.outcomes!.indirect.enabled = false;
  OneSignalPublic.config!.userConfig.outcomes!.unattributed.enabled = false;

  await OutcomeTestHelper.setupReceivedNotifications();
  const apiSpy = sinonSandbox.stub(OneSignalApiShared, "sendOutcome").resolves();
  sinonSandbox.stub(OneSignalPublic, "privateIsPushNotificationsEnabled").resolves(true);
  sinonSandbox.stub(MainHelper, "getCurrentNotificationType").resolves(SubscriptionStateKind.Subscribed);
  await OneSignalPublic.sendUniqueOutcome(OUTCOME_NAME);

  t.is(apiSpy.callCount, 0);
});


test("when direct outcome is sent twice, there is only one api call", async t => {
  const notificationClicked = OutcomeTestHelper.generateNotification();
  await Database.put("NotificationClicked", notificationClicked);
  const apiSpy = sinonSandbox.stub(OneSignalApiShared, "sendOutcome").resolves();
  const logSpy = sinonSandbox.stub(Log, "warn");
  sinonSandbox.stub(OneSignalPublic, "privateIsPushNotificationsEnabled").resolves(true);
  sinonSandbox.stub(MainHelper, "getCurrentNotificationType").resolves(SubscriptionStateKind.Subscribed);
  await OneSignalPublic.sendUniqueOutcome(OUTCOME_NAME);
  await OneSignalPublic.sendUniqueOutcome(OUTCOME_NAME);

  t.is(apiSpy.callCount, 1);
  t.is(logSpy.callCount, 1);
});

test("when indirect outcome is sent twice, there is only one api call", async t => {
  await OutcomeTestHelper.setupReceivedNotifications();
  const apiSpy = sinonSandbox.stub(OneSignalApiShared, "sendOutcome").resolves();
  const logSpy = sinonSandbox.stub(Log, "warn");
  sinonSandbox.stub(OneSignalPublic, "privateIsPushNotificationsEnabled").resolves(true);
  sinonSandbox.stub(MainHelper, "getCurrentNotificationType").resolves(SubscriptionStateKind.Subscribed);
  await OneSignalPublic.sendUniqueOutcome(OUTCOME_NAME);
  await OneSignalPublic.sendUniqueOutcome(OUTCOME_NAME);

  t.is(apiSpy.callCount, 1);
  t.is(logSpy.callCount, 1);
});

test("indirect outcome sent -> receive new notification -> indirect outcome sent, there are two api calls", async t => {
  await OutcomeTestHelper.setupReceivedNotifications();
  const apiSpy = sinonSandbox.stub(OneSignalApiShared, "sendOutcome").resolves();
  const logSpy = sinonSandbox.stub(Log, "warn");
  sinonSandbox.stub(OneSignalPublic, "privateIsPushNotificationsEnabled").resolves(true);
  sinonSandbox.stub(MainHelper, "getCurrentNotificationType").resolves(SubscriptionStateKind.Subscribed);
  await OneSignalPublic.sendUniqueOutcome(OUTCOME_NAME);
  await OutcomeTestHelper.setupReceivedNotifications();
  await OneSignalPublic.sendUniqueOutcome(OUTCOME_NAME);

  t.is(apiSpy.callCount, 2);
  t.is(logSpy.callCount, 0);
});

test("when unattributed outcome is sent twice, there is only one api call", async t => {
  await OutcomeTestHelper.initializeSession();
  const apiSpy = sinonSandbox.stub(OneSignalApiShared, "sendOutcome").resolves(true);
  const logSpy = sinonSandbox.stub(Log, "warn");
  sinonSandbox.stub(OneSignalPublic, "privateIsPushNotificationsEnabled").resolves(true);
  sinonSandbox.stub(MainHelper, "getCurrentNotificationType").resolves(SubscriptionStateKind.Subscribed);
  await OneSignalPublic.sendUniqueOutcome(OUTCOME_NAME);
  await OneSignalPublic.sendUniqueOutcome(OUTCOME_NAME);

  t.is(apiSpy.callCount, 1);
  t.is(logSpy.callCount, 1);
});

test("when new session starts between unattributed outcome sends, there are two api calls", async t => {
  const apiSpy = sinonSandbox.stub(OneSignalApiShared, "sendOutcome").resolves(true);
  const logSpy = sinonSandbox.stub(Log, "warn");
  sinonSandbox.stub(OneSignalPublic, "privateIsPushNotificationsEnabled").resolves(true);
  sinonSandbox.stub(MainHelper, "getCurrentNotificationType").resolves(SubscriptionStateKind.Subscribed);
  await OneSignalPublic.sendUniqueOutcome(OUTCOME_NAME);
  await OutcomeTestHelper.initializeSession();
  await OneSignalPublic.sendUniqueOutcome(OUTCOME_NAME);

  t.is(apiSpy.callCount, 2);
  t.is(logSpy.callCount, 0);
});

test("attribution of an outcome with multiple notifications happens correctly", async t => {
  sinonSandbox.stub(OneSignalApiShared, "sendOutcome").resolves(true);
  sinonSandbox.stub(OneSignalPublic, "privateIsPushNotificationsEnabled").resolves(true);
  sinonSandbox.stub(MainHelper, "getCurrentNotificationType").resolves(SubscriptionStateKind.Subscribed);

  const notificationArr = [];
  let notificationReceived = OutcomeTestHelper.generateNotification();
  notificationArr.push(notificationReceived.notificationId);
  await Database.put("NotificationReceived", notificationReceived);
  await OneSignalPublic.sendUniqueOutcome(OUTCOME_NAME);
  notificationReceived = OutcomeTestHelper.generateNotification();
  notificationArr.push(notificationReceived.notificationId);
  await Database.put("NotificationReceived", notificationReceived);
  await OneSignalPublic.sendUniqueOutcome(OUTCOME_NAME);

  const sentOutcome = await Database.get<SentUniqueOutcome>("SentUniqueOutcome", OUTCOME_NAME);
  t.true(_.isEqual(sentOutcome.notificationIds, notificationArr));
});
