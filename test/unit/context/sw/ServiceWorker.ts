import test from 'ava';
import sinon, { SinonSandbox, SinonStub } from 'sinon';
import nock from 'nock';

import OneSignal from '../../../../src/OneSignal';
import Database from '../../../../src/services/Database';
import Context from '../../../../src/models/Context';
import { ServiceWorker as ServiceWorkerReal } from "../../../../src/service-worker/ServiceWorker";

import { TestEnvironment, BrowserUserAgent, HttpHttpsEnvironment } from "../../../support/sdk/TestEnvironment";
import { setUserAgent } from '../../../support/tester/browser';
import Random from '../../../support/tester/Random';
import { MockServiceWorkerGlobalScope } from '../../../support/mocks/service-workers/models/MockServiceWorkerGlobalScope';
import MockNotification from '../../../support/mocks/MockNotification';
import { Subscription } from '../../../../src/models/Subscription';
import { MockPushEvent } from '../../../support/mocks/service-workers/models/MockPushEvent';
import { MockPushMessageData } from '../../../support/mocks/service-workers/models/MockPushMessageData';
import OneSignalApiSW from '../../../../src/OneSignalApiSW';
import { ConfigIntegrationKind } from '../../../../src/models/AppConfig';

declare var self: MockServiceWorkerGlobalScope;

let sandbox: SinonSandbox;

test.beforeEach(async function() {
  sandbox = sinon.sandbox.create();

  await TestEnvironment.stubServiceWorkerEnvironment();

  const appConfig = TestEnvironment.getFakeAppConfig();
  appConfig.appId = Random.getRandomUuid();
  OneSignal.context = new Context(appConfig);
});

test.afterEach(function () {
  sandbox.restore();
});


/***************************************************
 * onPushReceived() 
 ****************************************************/

test('onPushReceived - Ensure undefined payload does not throw', async t => {
  const mockPushEvent = new MockPushEvent(new MockPushMessageData());
  await ServiceWorkerReal.onPushReceived(mockPushEvent);
  t.pass();
});

/* MockPushSubscriptionChangeEvent */

/***************************************************
 * displayNotification()
 ****************************************************/
async function displayNotificationEnvSetup() {
  await TestEnvironment.initialize({ httpOrHttps: HttpHttpsEnvironment.Https });
  await TestEnvironment.stubServiceWorkerEnvironment();
  setUserAgent(BrowserUserAgent.ChromeWindowsSupported);
}
  
// Start - displayNotification - persistNotification
test('displayNotification - persistNotification - true', async t => {
  await displayNotificationEnvSetup();

  await Database.put('Options', { key: 'persistNotification', value: true });

  const showNotificationSpy = sandbox.spy(self.registration, "showNotification");
  await ServiceWorkerReal.displayNotification({});
  t.is(showNotificationSpy.getCall(0).args[1].requireInteraction, true);
});

test('displayNotification - persistNotification - undefined', async t => {
  await displayNotificationEnvSetup();

  const showNotificationSpy = sandbox.spy(self.registration, "showNotification");
  await ServiceWorkerReal.displayNotification({});
  t.is(showNotificationSpy.getCall(0).args[1].requireInteraction, true);
});

test('displayNotification - persistNotification - force', async t => {
  await displayNotificationEnvSetup();

  // "force isn't set any more but for legacy users it still results in true
  await Database.put('Options', { key: 'persistNotification', value: "force" });

  const showNotificationSpy = sandbox.spy(self.registration, "showNotification");
  await ServiceWorkerReal.displayNotification({});
  t.is(showNotificationSpy.getCall(0).args[1].requireInteraction, true);
});

test('displayNotification - persistNotification - true - Chrome macOS 10.15', async t => {
  await displayNotificationEnvSetup();
  setUserAgent(BrowserUserAgent.ChromeMac10_15);

  await Database.put('Options', { key: 'persistNotification', value: true });

  const showNotificationSpy = sandbox.spy(self.registration, "showNotification");
  await ServiceWorkerReal.displayNotification({});
  t.is(showNotificationSpy.getCall(0).args[1].requireInteraction, false);
});

test('displayNotification - persistNotification - true - Chrome macOS pre-10.15', async t => {
  await displayNotificationEnvSetup();
  setUserAgent(BrowserUserAgent.ChromeMacSupported);

  await Database.put('Options', { key: 'persistNotification', value: true });

  const showNotificationSpy = sandbox.spy(self.registration, "showNotification");
  await ServiceWorkerReal.displayNotification({});
  t.is(showNotificationSpy.getCall(0).args[1].requireInteraction, true);
});

test('displayNotification - persistNotification - true - Opera macOS 10.14', async t => {
  await displayNotificationEnvSetup();
  setUserAgent(BrowserUserAgent.OperaMac10_14);

  await Database.put('Options', { key: 'persistNotification', value: true });

  const showNotificationSpy = sandbox.spy(self.registration, "showNotification");
  await ServiceWorkerReal.displayNotification({});
  t.is(showNotificationSpy.getCall(0).args[1].requireInteraction, false);
});

test('displayNotification - persistNotification - false', async t => {
  await displayNotificationEnvSetup();

  await Database.put('Options', { key: 'persistNotification', value: false });

  const showNotificationSpy = sandbox.spy(self.registration, "showNotification");
  await ServiceWorkerReal.displayNotification({});
  t.is(showNotificationSpy.getCall(0).args[1].requireInteraction, false);
});
// End - displayNotification - persistNotification


 /***************************************************
 * onNotificationClicked()
 ****************************************************/
async function onNotificationClickedEnvSetup() {
  await TestEnvironment.initialize({ httpOrHttps: HttpHttpsEnvironment.Https });
  await TestEnvironment.stubServiceWorkerEnvironment();
}

async function setupFakeAppId(): Promise<string> {
  const appConfig = TestEnvironment.getFakeAppConfig();
  await Database.setAppConfig(appConfig);
  return appConfig.appId;
}

async function setupFakePlayerId(): Promise<string> {
  const subscription: Subscription = new Subscription();
  subscription.deviceId = Random.getRandomUuid();
  await OneSignal.database.setSubscription(subscription);
  return subscription.deviceId;
}

function mockNotificationNotificationEventInit(id: string): NotificationEventInit {
  const notificationOptions: NotificationOptions = { data: { id: id } };
  const notification = new MockNotification("Title", notificationOptions);
  return { notification: notification };
}

test('onNotificationClicked - notification click sends PUT api/v1/notification', async t => {
  await onNotificationClickedEnvSetup();

  const appId = await setupFakeAppId();
  const playerId = await setupFakePlayerId();
  const notificationId = Random.getRandomUuid();

  const notificationPutCall = nock("https://onesignal.com")
    .put(`/api/v1/notifications/${notificationId}`)
    .reply(200, (_uri: string, requestBody: string) => {
      t.deepEqual(JSON.parse(requestBody), {
        app_id: appId,
        opened: true,
        player_id: playerId
      });
      return { success: true };
    });

  const notificationEvent = mockNotificationNotificationEventInit(notificationId);
  await ServiceWorkerReal.onNotificationClicked(notificationEvent);

  t.true(notificationPutCall.isDone());
});

test('onNotificationClicked - notification click count omitted when appId is null', async t => {
  await onNotificationClickedEnvSetup();

  const notificationId = Random.getRandomUuid();

  const notificationPutCall = nock("https://onesignal.com")
    .put(`/api/v1/notifications/${notificationId}`)
    .reply(200);

  const notificationEvent = mockNotificationNotificationEventInit(notificationId);
  await ServiceWorkerReal.onNotificationClicked(notificationEvent);

  t.false(notificationPutCall.isDone());
});

function addNotificationPutNock(notificationId: string) {
  nock("https://onesignal.com")
    .put(`/api/v1/notifications/${notificationId}`)
    .reply(200);
}

test('onNotificationClicked - sends webhook', async t => {
  await onNotificationClickedEnvSetup();

  const notificationId = Random.getRandomUuid();
  addNotificationPutNock(notificationId);

  const executeWebhooksSpy = sandbox.stub(ServiceWorkerReal, "executeWebhooks");

  const notificationEvent = mockNotificationNotificationEventInit(notificationId);
  await ServiceWorkerReal.onNotificationClicked(notificationEvent);
  t.true(executeWebhooksSpy.calledWithExactly(
    'notification.clicked',
    notificationEvent.notification.data
  ));
});

test('onNotificationClicked - openWindow', async t => {
  await onNotificationClickedEnvSetup();

  const notificationId = Random.getRandomUuid();
  addNotificationPutNock(notificationId);

  const openWindowMock = sandbox.stub(self.clients, "openWindow");

  const notificationEvent = mockNotificationNotificationEventInit(notificationId);
  await ServiceWorkerReal.onNotificationClicked(notificationEvent);

  t.true(openWindowMock.calledWithExactly('https://site.com'));
});

/*
 Order is important on Chrome for Android when the site is added to the HomeScreen as a PWA app.
   - A correctly configured manifest.json file is required for it to become a PWA.
 We must make sure the network call is kicked off before opening a page as the ServiceWorker
   stops executing as soon as openWindow is called,
   before the onNotificationClicked function finishes.
*/
test('onNotificationClicked - notification PUT Before openWindow', async t => {
  await onNotificationClickedEnvSetup();
  await setupFakeAppId();

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
  await ServiceWorkerReal.onNotificationClicked(notificationEvent);

  t.deepEqual(callOrder, ["notificationPut", "openWindow"]);
});

/***************************************************
 * sendConfirmedDelivery() 
 ****************************************************/

 // HELPER: mocks the call to the notifications report_received endpoint
 function mockNotificationPutCall(notificationId : any) {
  return nock("https://onesignal.com")
    .put(`/api/v1/notifications/${notificationId}/report_received`)
    .reply(200, { success: true });
 }

 // HELPER: stubs the receive_receipts_enable of the ServerAppConfig object
 function stubServerAppConfig(receiveReceiptsEnable : boolean) {
  sandbox.stub(OneSignalApiSW, 'downloadServerAppConfig')
  .resolves(TestEnvironment.getFakeServerAppConfig(
    ConfigIntegrationKind.TypicalSite,
    true,
    { features : { receive_receipts_enable : receiveReceiptsEnable } }
    ));
 }

 // HELPER: sets a fake subscription
 async function fakeSetSubscription(){
  const playerId = Random.getRandomUuid();
  const subscription = new Subscription();
  subscription.deviceId = playerId;
  await Database.setSubscription(subscription);
 }

 test('sendConfirmedDelivery - notification is null - feature flag is true', async t => {
   const notificationId = null;
   const notificationPutCall = mockNotificationPutCall(notificationId);
   stubServerAppConfig(true);
   fakeSetSubscription();

   await ServiceWorkerReal.sendConfirmedDelivery({ id: notificationId });
   t.false(notificationPutCall.isDone());
 });

 test('sendConfirmedDelivery - notification is valid - feature flag is true', async t => {
  const notificationId = Random.getRandomUuid();
  const notificationPutCall = mockNotificationPutCall(notificationId);
  stubServerAppConfig(true);
  fakeSetSubscription();

  await ServiceWorkerReal.sendConfirmedDelivery({ id: notificationId });
  t.true(notificationPutCall.isDone());
 });

 test('sendConfirmedDelivery - notification is valid - feature flag is false', async t => {
  const notificationId = Random.getRandomUuid();
  const notificationPutCall = mockNotificationPutCall(notificationId);
  stubServerAppConfig(false);
  fakeSetSubscription();

  await ServiceWorkerReal.sendConfirmedDelivery({ id: notificationId });
  t.false(notificationPutCall.isDone());
 });