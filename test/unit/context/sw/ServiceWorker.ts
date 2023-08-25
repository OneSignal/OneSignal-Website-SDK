import test, { ExecutionContext } from 'ava';
import sinon, { SinonSandbox, SinonSpy } from 'sinon';
import nock from 'nock';

import Database from '../../../../src/shared/services/Database';
import { ServiceWorker as OSServiceWorker } from "../../../../src/sw/serviceWorker/ServiceWorker";

import { TestEnvironment, BrowserUserAgent } from "../../../support/sdk/TestEnvironment";
import { setUserAgent } from '../../../support/tester/browser';
import Random from '../../../support/tester/Random';
import { MockServiceWorkerGlobalScope }
  from '../../../support/mocks/service-workers/models/MockServiceWorkerGlobalScope';
import MockNotification from '../../../support/mocks/MockNotification';
import { Subscription } from '../../../../src/shared/models/Subscription';
import { MockPushEvent } from '../../../support/mocks/service-workers/models/MockPushEvent';
import { MockPushMessageData } from '../../../support/mocks/service-workers/models/MockPushMessageData';
import OneSignalUtils from '../../../../src/shared/utils/OneSignalUtils';
import { setupFakePlayerId } from '../../../support/tester/utils';
import * as awaitableTimeout from '../../../../src/shared/utils/AwaitableTimeout';
import { NockOneSignalHelper } from '../../../../test/support/tester/NockOneSignalHelper';

declare let self: MockServiceWorkerGlobalScope;

let sandbox: SinonSandbox;
const appConfig = TestEnvironment.getFakeAppConfig();

test.beforeEach(async function() {
  sandbox = sinon.sandbox.create();
  await TestEnvironment.initializeForServiceWorker();

  await Database.setAppConfig(appConfig);
});

test.afterEach(function () {
  sandbox.restore();
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
  // Only one should show
  t.is(spy.callCount, 1);

  const notifTitle: string = spy.lastCall.args[0];
  const options: NotificationOptions | undefined = spy.lastCall.args[1];

  // Must have a title
  t.truthy(notifTitle);

  // Must have options set
  if (typeof options === "undefined") {
    t.fail("assertValidNotificationShown - Missing options");
    return;
  }

  // data.id must be a valid UUID (this is the OneSignal Notification id)
  t.true(OneSignalUtils.isValidUuid(options.data.id));
}

test('onPushReceived - Ensure undefined payload does not show', async t => {
  const showNotificationSpy = sandbox.spy(self.registration, "showNotification");

  const mockPushEvent = new MockPushEvent(new MockPushMessageData());
  OSServiceWorker.onPushReceived(mockPushEvent);
  await mockPushEvent.lastWaitUntilPromise;

  t.true(showNotificationSpy.notCalled);
});

test('onPushReceived - Ensure empty payload does not show', async t => {
  const showNotificationSpy = sandbox.spy(self.registration, "showNotification");

  const mockPushEvent = new MockPushEvent(new MockPushMessageData({}));
  OSServiceWorker.onPushReceived(mockPushEvent);
  await mockPushEvent.lastWaitUntilPromise;

  t.true(showNotificationSpy.notCalled);
});

test('onPushReceived - Ensure non-OneSignal payload does not show', async t => {
  const showNotificationSpy = sandbox.spy(self.registration, "showNotification");

  const mockPushEvent = new MockPushEvent(new MockPushMessageData({ title: "Test Title" }));
  OSServiceWorker.onPushReceived(mockPushEvent);
  await mockPushEvent.lastWaitUntilPromise;

  t.true(showNotificationSpy.notCalled);
});

test('onPushReceived - Ensure display when only required values', async t => {
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


// Start - displayNotification - persistNotification
test('displayNotification - persistNotification - true', async t => {
  setUserAgent(BrowserUserAgent.ChromeWindowsSupported);

  await Database.put('Options', { key: 'persistNotification', value: true });

  const showNotificationSpy = sandbox.spy(self.registration, "showNotification");
  await OSServiceWorker.displayNotification({
    body: '',
    confirmDelivery: false,
    notificationId: ''
  });
  t.is(showNotificationSpy.getCall(0).args[1].requireInteraction, true);
});

test('displayNotification - persistNotification - undefined', async t => {
  setUserAgent(BrowserUserAgent.ChromeWindowsSupported);

  const showNotificationSpy = sandbox.spy(self.registration, "showNotification");
  await OSServiceWorker.displayNotification({
    body: '',
    confirmDelivery: false,
    notificationId: ''
  });
  t.is(showNotificationSpy.getCall(0).args[1].requireInteraction, true);
});

test('displayNotification - persistNotification - force', async t => {
  setUserAgent(BrowserUserAgent.ChromeWindowsSupported);

  // "force isn't set any more but for legacy users it still results in true
  await Database.put('Options', { key: 'persistNotification', value: "force" });

  const showNotificationSpy = sandbox.spy(self.registration, "showNotification");
  await OSServiceWorker.displayNotification({
    body: '',
    confirmDelivery: false,
    notificationId: ''
  });
  t.is(showNotificationSpy.getCall(0).args[1].requireInteraction, true);
});

test('displayNotification - persistNotification - false', async t => {
  setUserAgent(BrowserUserAgent.ChromeWindowsSupported);

  await Database.put('Options', { key: 'persistNotification', value: false });

  const showNotificationSpy = sandbox.spy(self.registration, "showNotification");
  await OSServiceWorker.displayNotification({
    body: '',
    confirmDelivery: false,
    notificationId: ''
  });
  t.is(showNotificationSpy.getCall(0).args[1].requireInteraction, false);
});
// End - displayNotification - persistNotification


 /***************************************************
 * onNotificationClicked()
 ****************************************************/

function mockNotificationNotificationEventInit(id: string): NotificationEventInit {
  const notificationOptions: NotificationOptions = { data: { id: id } };
  const notification = new MockNotification("Title", notificationOptions);
  return { notification: notification };
}

test('onNotificationClicked - notification click sends PUT api/v1/notification', async t => {
  const playerId = await setupFakePlayerId();
  const notificationId = Random.getRandomUuid();

  const notificationPutNock = NockOneSignalHelper.nockNotificationPut(notificationId);

  const notificationEvent = mockNotificationNotificationEventInit(notificationId);
  await OSServiceWorker.onNotificationClicked(notificationEvent);

  const { request } = (await notificationPutNock.result);

  t.true(notificationPutNock.nockScope.isDone());
  t.deepEqual(request.body, {
    app_id: appConfig.appId,
    opened: true,
    player_id: playerId,
    device_type: 5
  });
});

test('onNotificationClicked - notification click count omitted when appId is null', async t => {
  await TestEnvironment.initializeForServiceWorker();

  // Remove AppId to test it being msising
  const appConfig = TestEnvironment.getFakeAppConfig();
  appConfig.appId = "";

  const notificationId = Random.getRandomUuid();

  const notificationPutCall = NockOneSignalHelper.nockNotificationPut(notificationId);

  const notificationEvent = mockNotificationNotificationEventInit(notificationId);
  await OSServiceWorker.onNotificationClicked(notificationEvent);

  t.false(notificationPutCall.nockScope.isDone());
});

test('onNotificationClicked - sends webhook', async t => {
  const notificationId = Random.getRandomUuid();
  NockOneSignalHelper.nockNotificationPut(notificationId);

  const executeWebhooksSpy = sandbox.stub(OSServiceWorker, "executeWebhooks");

  const notificationEvent = mockNotificationNotificationEventInit(notificationId);
  await OSServiceWorker.onNotificationClicked(notificationEvent);
  t.true(executeWebhooksSpy.calledWithExactly(
    'notification.clicked',
    notificationEvent.notification.data
  ));
});

test('onNotificationClicked - openWindow', async t => {
  const notificationId = Random.getRandomUuid();
  NockOneSignalHelper.nockNotificationPut(notificationId);

  const openWindowMock = sandbox.stub(self.clients, "openWindow");

  const notificationEvent = mockNotificationNotificationEventInit(notificationId);
  await OSServiceWorker.onNotificationClicked(notificationEvent);

  t.deepEqual(openWindowMock.getCalls().map(call => call.args[0]), ['https://localhost:3001']);
});

/*
 Order is important on Chrome for Android when the site is added to the HomeScreen as a PWA app.
   - A correctly configured manifest.json file is required for it to become a PWA.
 We must make sure the network call is kicked off before opening a page as the ServiceWorker
   stops executing as soon as openWindow is called,
   before the onNotificationClicked function finishes.
*/
test('onNotificationClicked - notification PUT Before openWindow', async t => {
  const notificationId = Random.getRandomUuid();

  const callOrder: string[] = [];
  sandbox.stub(self.clients, "openWindow", function() {
    callOrder.push("openWindow");
  });

  nock("https://onesignal.com")
    .put(`/api/v1/notifications/${notificationId}`)
    .reply(200, (_uri: string, _requestBody: string) => {
      callOrder.push("notificationPut");
      return { success: true };
    });

  const notificationEvent = mockNotificationNotificationEventInit(notificationId);
  await OSServiceWorker.onNotificationClicked(notificationEvent);

  t.deepEqual(callOrder, ["notificationPut", "openWindow"]);
});

/***************************************************
 * sendConfirmedDelivery()
 ****************************************************/

 // HELPER: sets a fake subscription
 async function fakeSetSubscription(){
  const playerId = Random.getRandomUuid();
  const subscription = new Subscription();
  subscription.deviceId = playerId;
  await Database.setSubscription(subscription);
 }

 test('sendConfirmedDelivery - notification is valid - feature flag is y', async t => {
  sandbox.stub(awaitableTimeout, 'awaitableTimeout');
  const notificationId = Random.getRandomUuid();
  const notificationPutCall = NockOneSignalHelper.nockNotificationConfirmedDelivery(notificationId);
  await fakeSetSubscription();

  await OSServiceWorker.sendConfirmedDelivery({
    notificationId: notificationId, confirmDelivery: true, body: "",
  });
  t.true(notificationPutCall.nockScope.isDone());
 });

 test('sendConfirmedDelivery - notification is valid - feature flag is n', async t => {
  sandbox.stub(awaitableTimeout, 'awaitableTimeout');
  const notificationId = Random.getRandomUuid();
  const notificationPutCall = NockOneSignalHelper.nockNotificationConfirmedDelivery(notificationId);
  await fakeSetSubscription();

  await OSServiceWorker.sendConfirmedDelivery({
    notificationId: notificationId, confirmDelivery: false, body: "",
  });
  t.false(notificationPutCall.nockScope.isDone());
 });

 test('sendConfirmedDelivery - notification is valid - feature flag is undefined', async t => {
  sandbox.stub(awaitableTimeout, 'awaitableTimeout');
  const notificationId = Random.getRandomUuid();
  const notificationPutCall = NockOneSignalHelper.nockNotificationConfirmedDelivery(notificationId);
  await fakeSetSubscription();

  await OSServiceWorker.sendConfirmedDelivery({
    notificationId: notificationId, confirmDelivery: false, body: "",
  });
  t.false(notificationPutCall.nockScope.isDone());
 });

 // checks `device_type` is being sent: helpful in reducing lookup time for outcome events on backend
 test('sendConfirmedDelivery - sends device_type', async t => {
  sandbox.stub(awaitableTimeout, 'awaitableTimeout');
  await fakeSetSubscription();
  const notificationId = Random.getRandomUuid();
  const notificationNock = NockOneSignalHelper.nockNotificationConfirmedDelivery(notificationId);

  await OSServiceWorker.sendConfirmedDelivery({
    notificationId: notificationId, confirmDelivery: true, body: "",
  });
  const requestBody = (await notificationNock.result).request.body;
  t.is(requestBody.device_type, 5); // 5 = chrome like
 });
