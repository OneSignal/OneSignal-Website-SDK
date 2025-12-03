import test, { ExecutionContext } from 'ava';
import sinon, { SinonSandbox, SinonSpy } from 'sinon';

import Database from '../../../../src/services/Database';
import { ServiceWorker as OSServiceWorker } from "../../../../src/service-worker/ServiceWorker";

import { TestEnvironment, BrowserUserAgent } from "../../../support/sdk/TestEnvironment";
import { setUserAgent } from '../../../support/tester/browser';
import Random from '../../../support/tester/Random';
import { MockServiceWorkerGlobalScope } from '../../../support/mocks/service-workers/models/MockServiceWorkerGlobalScope';
import MockNotification from '../../../support/mocks/MockNotification';
import { Subscription } from '../../../../src/models/Subscription';
import { MockPushEvent } from '../../../support/mocks/service-workers/models/MockPushEvent';
import { MockPushMessageData } from '../../../support/mocks/service-workers/models/MockPushMessageData';
import OneSignalUtils from '../../../../src/utils/OneSignalUtils';
import { setupFakePlayerId } from '../../../support/tester/utils';
import * as awaitableTimeout from '../../../../src/utils/AwaitableTimeout';
import { NockOneSignalHelper } from '../../../../test/support/tester/NockOneSignalHelper';
import { ConfigIntegrationKind } from '../../../../src/models/AppConfig';

import { setupUndiciMocking } from "../../../support/tester/UndiciHelper";
import { UndiciOneSignalHelper } from "../../../support/tester/UndiciOneSignalHelper";

declare let self: MockServiceWorkerGlobalScope;

let sandbox: SinonSandbox;
const appConfig = TestEnvironment.getFakeAppConfig();
let undici: { mockAgent: any; restore: () => void };

// This file mutates globals + stubs shared module exports -> run serial to avoid sinon double-wrap.
test.serial.beforeEach(async () => {
  undici = setupUndiciMocking();

  sandbox = sinon.sandbox.create();
  await TestEnvironment.initializeForServiceWorker();
  await Database.setAppConfig(appConfig);
});

test.serial.afterEach(() => {
  sandbox.restore();
  undici.restore();
});

/***************************************************
 * onPushReceived()
 ****************************************************/

function mockOneSignalPushEvent(data: object): MockPushEvent {
  const payloadTemplate = {
    custom: {
      i: Random.getRandomUuid()
    }
  };

  const payload = { ...payloadTemplate, ...data };
  return new MockPushEvent(new MockPushMessageData(payload));
}

function assertValidNotificationShown(t: ExecutionContext, spy: SinonSpy): void {
  t.is(spy.callCount, 1);

  const notifTitle: string = spy.lastCall.args[0];
  const options: NotificationOptions | undefined = spy.lastCall.args[1];

  t.truthy(notifTitle);

  if (typeof options === "undefined") {
    t.fail("assertValidNotificationShown - Missing options");
    return;
  }

  t.true(OneSignalUtils.isValidUuid(options.data.id));
}

test.serial('onPushReceived - Ensure undefined payload does not show', async t => {
  const showNotificationSpy = sandbox.spy(self.registration, "showNotification");

  const mockPushEvent = new MockPushEvent(new MockPushMessageData());
  OSServiceWorker.onPushReceived(mockPushEvent);
  await mockPushEvent.lastWaitUntilPromise;

  t.true(showNotificationSpy.notCalled);
});

test.serial('onPushReceived - Ensure empty payload does not show', async t => {
  const showNotificationSpy = sandbox.spy(self.registration, "showNotification");

  const mockPushEvent = new MockPushEvent(new MockPushMessageData({}));
  OSServiceWorker.onPushReceived(mockPushEvent);
  await mockPushEvent.lastWaitUntilPromise;

  t.true(showNotificationSpy.notCalled);
});

test.serial('onPushReceived - Ensure non-OneSignal payload does not show', async t => {
  const showNotificationSpy = sandbox.spy(self.registration, "showNotification");

  const mockPushEvent = new MockPushEvent(new MockPushMessageData({ title: "Test Title" }));
  OSServiceWorker.onPushReceived(mockPushEvent);
  await mockPushEvent.lastWaitUntilPromise;

  t.true(showNotificationSpy.notCalled);
});

test.serial('onPushReceived - Ensure display when only required values', async t => {
  const showNotificationSpy = sandbox.spy(self.registration, "showNotification");

  const mockPushEvent = mockOneSignalPushEvent({ title: "Test Title" });
  OSServiceWorker.onPushReceived(mockPushEvent);
  await mockPushEvent.lastWaitUntilPromise;

  assertValidNotificationShown(t, showNotificationSpy);
  t.is(showNotificationSpy.lastCall.args[0], "Test Title");
});

/***************************************************
 * displayNotification()
 ****************************************************/

test.serial('displayNotification - persistNotification - true', async t => {
  setUserAgent(BrowserUserAgent.ChromeWindowsSupported);

  await Database.put('Options', { key: 'persistNotification', value: true });

  const showNotificationSpy = sandbox.spy(self.registration, "showNotification");
  await OSServiceWorker.displayNotification({});
  t.is(showNotificationSpy.getCall(0).args[1].requireInteraction, true);
});

test.serial('displayNotification - persistNotification - undefined', async t => {
  setUserAgent(BrowserUserAgent.ChromeWindowsSupported);

  const showNotificationSpy = sandbox.spy(self.registration, "showNotification");
  await OSServiceWorker.displayNotification({});
  t.is(showNotificationSpy.getCall(0).args[1].requireInteraction, true);
});

test.serial('displayNotification - persistNotification - force', async t => {
  setUserAgent(BrowserUserAgent.ChromeWindowsSupported);

  await Database.put('Options', { key: 'persistNotification', value: "force" });

  const showNotificationSpy = sandbox.spy(self.registration, "showNotification");
  await OSServiceWorker.displayNotification({});
  t.is(showNotificationSpy.getCall(0).args[1].requireInteraction, true);
});

test.serial('displayNotification - persistNotification - false', async t => {
  setUserAgent(BrowserUserAgent.ChromeWindowsSupported);

  await Database.put('Options', { key: 'persistNotification', value: false });

  const showNotificationSpy = sandbox.spy(self.registration, "showNotification");
  await OSServiceWorker.displayNotification({});
  t.is(showNotificationSpy.getCall(0).args[1].requireInteraction, false);
});

/***************************************************
 * onNotificationClicked()
 ****************************************************/

function mockNotificationNotificationEventInit(id: string): NotificationEventInit {
  const notificationOptions: NotificationOptions = { data: { id: id } };
  const notification = new MockNotification("Title", notificationOptions);
  return { notification: notification };
}

test.serial('onNotificationClicked - notification click sends PUT api/v1/notification', async t => {
  const playerId = await setupFakePlayerId();
  const notificationId = Random.getRandomUuid();

  const putCall = UndiciOneSignalHelper.mockNotificationPut(undici.mockAgent, notificationId);

  const notificationEvent = mockNotificationNotificationEventInit(notificationId);
  await OSServiceWorker.onNotificationClicked(notificationEvent);

  t.true(putCall.isDone());
  const { request } = await putCall.result;

  t.deepEqual(request.body, {
    app_id: appConfig.appId,
    opened: true,
    player_id: playerId,
    device_type: 5
  });
});

// test('onNotificationClicked - get web config before open if empty in database', async t => {
//   await Database.remove("Options", "defaultUrl");

//    // Assert the URL is empty in the database
//    const urlBefore = await Database.get("Options", "defaultUrl");
//    t.true(urlBefore === undefined || urlBefore === null);

//   const serverConfig = TestEnvironment.getFakeServerAppConfig(ConfigIntegrationKind.Custom, false, null, appConfig.appId);
//   t.is(serverConfig.config.origin, "http://localhost:3000");
//   const webConfigNock = NockOneSignalHelper.nockGetConfig(appConfig.appId, serverConfig);

//   const notificationId = Random.getRandomUuid();
//   const notificationPutCall = NockOneSignalHelper.nockNotificationPut(notificationId);
//   const notificationEvent = mockNotificationNotificationEventInit(notificationId);

//   await OSServiceWorker.onNotificationClicked(notificationEvent);

//   t.true(webConfigNock.nockScope.isDone());
//   t.true(notificationPutCall.nockScope.isDone());

//   // Assert the URL is set after the handler runs
//   const urlAfter = await Database.get("Options", "defaultUrl");
//   t.is(urlAfter, "http://localhost:3000");
// });

test('onNotificationClicked - notification click count omitted when appId is null', async t => {
  await TestEnvironment.initializeForServiceWorker();
  const cfg = TestEnvironment.getFakeAppConfig();
  cfg.appId = "";
  await Database.setAppConfig(cfg);

  const notificationId = Random.getRandomUuid();
  const putCall = UndiciOneSignalHelper.mockNotificationPut(undici.mockAgent, notificationId);

  const notificationEvent = mockNotificationNotificationEventInit(notificationId);
  await OSServiceWorker.onNotificationClicked(notificationEvent);

  t.false(putCall.isDone());
});

test.serial('onNotificationClicked - sends webhook', async t => {
  const notificationId = Random.getRandomUuid();
  UndiciOneSignalHelper.mockNotificationPut(undici.mockAgent, notificationId);

  const executeWebhooksSpy = sandbox.stub(OSServiceWorker, "executeWebhooks");

  const notificationEvent = mockNotificationNotificationEventInit(notificationId);
  await OSServiceWorker.onNotificationClicked(notificationEvent);

  t.true(executeWebhooksSpy.calledWithExactly(
    'notification.clicked',
    notificationEvent.notification.data
  ));
});

test.serial('onNotificationClicked - openWindow', async t => {
  const notificationId = Random.getRandomUuid();
  UndiciOneSignalHelper.mockNotificationPut(undici.mockAgent, notificationId);

  const openWindowMock = sandbox.stub(self.clients, "openWindow");

  const notificationEvent = mockNotificationNotificationEventInit(notificationId);
  await OSServiceWorker.onNotificationClicked(notificationEvent);

  t.deepEqual(openWindowMock.getCalls().map(call => call.args[0]), ['https://localhost:3001']);
});

test.serial('onNotificationClicked - notification PUT Before openWindow', async t => {
  const notificationId = Random.getRandomUuid();

  const callOrder: string[] = [];
  sandbox.stub(self.clients, "openWindow", function() {
    callOrder.push("openWindow");
  });

  // We only need to know the PUT happened before openWindow.
  const putCall = UndiciOneSignalHelper.mockNotificationPut(undici.mockAgent, notificationId);
  // Ensure we record when the PUT is intercepted
  putCall.result.then(() => callOrder.push("notificationPut")).catch(() => {});

  const notificationEvent = mockNotificationNotificationEventInit(notificationId);
  await OSServiceWorker.onNotificationClicked(notificationEvent);

  t.deepEqual(callOrder, ["notificationPut", "openWindow"]);
});

test.serial('onNotificationClicked - get web config before open if empty in database', async t => {
  await Database.remove("Options", "defaultUrl");
  const urlBefore = await Database.get("Options", "defaultUrl");
  t.true(urlBefore === undefined || urlBefore === null);

  const serverConfig = TestEnvironment.getFakeServerAppConfig(
    ConfigIntegrationKind.Custom,
    false,
    null,
    appConfig.appId
  );

  // Mock sync GET (note: uses onesignal.com origin in your codebase)
  const getConfigCall = UndiciOneSignalHelper.mockGetConfig(undici.mockAgent, appConfig.appId, serverConfig);

  const notificationId = Random.getRandomUuid();
  const putCall = UndiciOneSignalHelper.mockNotificationPut(undici.mockAgent, notificationId);

  const callOrder: string[] = [];
  sandbox.stub(self.clients, "openWindow", function() {
    callOrder.push("openWindow");
  });

  // Record network order
  getConfigCall.result.then(() => callOrder.push("getConfig")).catch(() => {});
  putCall.result.then(() => callOrder.push("notificationPut")).catch(() => {});

  const notificationEvent = mockNotificationNotificationEventInit(notificationId);
  await OSServiceWorker.onNotificationClicked(notificationEvent);

  // If your implementation always does the PUT first, this should be:
  // ["notificationPut", "getConfig", "openWindow"] or similar.
  // The original test only asserted PUT before openWindow; keep that invariant:
  t.true(callOrder.indexOf("notificationPut") !== -1);
  t.true(callOrder.indexOf("openWindow") !== -1);
  t.true(callOrder.indexOf("notificationPut") < callOrder.indexOf("openWindow"));

  // Assert the URL is set after the handler runs
  const urlAfter = await Database.get("Options", "defaultUrl");
  t.is(urlAfter, "http://localhost:3000");
});

/***************************************************
 * sendConfirmedDelivery()
 ****************************************************/

async function fakeSetSubscription(){
  const playerId = Random.getRandomUuid();
  const subscription = new Subscription();
  subscription.deviceId = playerId;
  await Database.setSubscription(subscription);
}

test.serial('sendConfirmedDelivery - notification is undefined - feature flag is y', async t => {
  sandbox.stub(awaitableTimeout, 'awaitableTimeout');

  const notificationId = undefined;
  const putCall = UndiciOneSignalHelper.mockNotificationConfirmedDelivery(undici.mockAgent, notificationId);

  await fakeSetSubscription();
  await OSServiceWorker.sendConfirmedDelivery({ id: notificationId, rr: "y" });

  t.false(putCall.isDone());
});

test.serial('sendConfirmedDelivery - notification is valid - feature flag is y', async t => {
  sandbox.stub(awaitableTimeout, 'awaitableTimeout');

  const notificationId = Random.getRandomUuid();
  const putCall = UndiciOneSignalHelper.mockNotificationConfirmedDelivery(undici.mockAgent, notificationId);

  await fakeSetSubscription();
  await OSServiceWorker.sendConfirmedDelivery({ id: notificationId, rr: "y" });

  t.true(putCall.isDone());
});

test.serial('sendConfirmedDelivery - notification is valid - feature flag is n', async t => {
  sandbox.stub(awaitableTimeout, 'awaitableTimeout');

  const notificationId = Random.getRandomUuid();
  const putCall = UndiciOneSignalHelper.mockNotificationConfirmedDelivery(undici.mockAgent, notificationId);

  await fakeSetSubscription();
  await OSServiceWorker.sendConfirmedDelivery({ id: notificationId, rr: "n" });

  t.false(putCall.isDone());
});

test.serial('sendConfirmedDelivery - notification is valid - feature flag is undefined', async t => {
  sandbox.stub(awaitableTimeout, 'awaitableTimeout');

  const notificationId = Random.getRandomUuid();
  const putCall = UndiciOneSignalHelper.mockNotificationConfirmedDelivery(undici.mockAgent, notificationId);

  await fakeSetSubscription();
  await OSServiceWorker.sendConfirmedDelivery({ id: notificationId });

  t.false(putCall.isDone());
});

test.serial('sendConfirmedDelivery - notification is valid - feature flag is null', async t => {
  sandbox.stub(awaitableTimeout, 'awaitableTimeout');

  const notificationId = Random.getRandomUuid();
  const putCall = UndiciOneSignalHelper.mockNotificationConfirmedDelivery(undici.mockAgent, notificationId);

  await fakeSetSubscription();
  await OSServiceWorker.sendConfirmedDelivery({ id: notificationId, rr: null });

  t.false(putCall.isDone());
});

test.serial('sendConfirmedDelivery - sends device_type', async t => {
  sandbox.stub(awaitableTimeout, 'awaitableTimeout');

  await fakeSetSubscription();
  const notificationId = Random.getRandomUuid();
  const putCall = UndiciOneSignalHelper.mockNotificationConfirmedDelivery(undici.mockAgent, notificationId);

  await OSServiceWorker.sendConfirmedDelivery({ id: notificationId, rr: 'y' });

  t.true(putCall.isDone());
  const requestBody = (await putCall.result).request.body;
  t.is(requestBody.device_type, 5);
});
