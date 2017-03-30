import "../../support/polyfills/polyfills";
import test from "ava";
import { TestEnvironment, ServiceWorkerTestEnvironment } from '../../support/sdk/TestEnvironment';
import OneSignal from "../../../src/OneSignal";
import Random from "../../support/tester/Random";
import { PushEvent, NotificationEvent } from '../../support/mocks/service-workers/utils/events';
import Client from '../../support/mocks/service-workers/models/Client';
import * as sinon from 'sinon';
import { Notification } from '../../../src/models/Notification';

interface NotificationClickTestContext {
  worker: ServiceWorkerTestEnvironment,
  event: NotificationEvent
}

async function setNotificationClickHandlerMatch(worker: ServiceWorkerTestEnvironment, string) {
  return await worker.OneSignal.database.put('Options', {
    key: 'notificationClickHandlerMatch',
    value: string
  });
}

async function setNotificationClickHandlerAction(worker: ServiceWorkerTestEnvironment, string) {
  return await worker.OneSignal.database.put('Options', {
    key: 'notificationClickHandlerAction',
    value: string
  });
}

async function setHttpLastKnownHostUrl(worker: ServiceWorkerTestEnvironment, string) {
  return await worker.OneSignal.database.put('Options', {
    key: 'lastKnownHostUrl',
    value: string
  });
}

async function setActiveClients(worker: ServiceWorkerTestEnvironment, ...clients: Client[]) {
  if (clients) {
    worker.clients.clients = clients;
  } else {
    worker.clients.clients = [];
  }
}

test.beforeEach(async t => {
  t.context.worker = await TestEnvironment.stubServiceWorkerEnvironment();
  t.context.event = NotificationEvent.createMockWithPayload();
});

test("should close notification", async t => {
  const { worker, event } = t.context as NotificationClickTestContext;
  const spy = sinon.spy(event.notification, 'close');
  const result = await worker.OneSignal.onNotificationClicked(event);
  t.true(spy.calledOnce);
  spy.restore();
});

test("HTTPS, 0 tabs, opens notification's URL, event available after", async t => {
  const { worker } = t.context as NotificationClickTestContext;
  const notification = new Notification('title', {
    url: 'https://google.com'
  });
  const event = NotificationEvent.createMockWithPayload(notification);
  setActiveClients(worker);

  const spy = sinon.spy(worker.OneSignal, 'openUrl');

  const result = await worker.OneSignal.onNotificationClicked(event);
  const notifications = await worker.registration.getNotifications();

  t.true(spy.calledWith(notification.url));
  spy.restore();
    debugger;

  const appState = await worker.OneSignal.database.getAppState();
  const pageClickedNotifications = appState.clickedNotifications[notification.url];
  t.true(pageClickedNotifications.url === notification.url && pageClickedNotifications.timestamp !== null);
});

test("HTTPS, 1 tab, same URL, focuses and fires event, event is not available after", async t => {
  const { worker } = t.context as NotificationClickTestContext;
  const notification = new Notification('title', {
    url: 'https://google.com'
  });
  const event = NotificationEvent.createMockWithPayload(notification);
  const client = new Client('https://google.com', 'top-level');
  setActiveClients(worker, client);

  const openUrlSpy = sinon.spy(worker.OneSignal, 'openUrl');
  const clientFocusSpy = sinon.spy(client, 'focus');
  const swivelEmitSpy = sinon.spy(worker.OneSignal.swivel, 'emit');

  const result = await worker.OneSignal.onNotificationClicked(event);
  const notifications = await worker.registration.getNotifications();

  t.true(swivelEmitSpy.calledWith(client.id, 'notification.clicked'));
  t.true(openUrlSpy.notCalled);
  t.true(clientFocusSpy.calledOnce);
  swivelEmitSpy.restore();
  openUrlSpy.restore();
  clientFocusSpy.restore();

  const appState = await worker.OneSignal.database.getAppState();
  t.is(appState.clickedNotifications[notification.url], undefined);
});

test("HTTPS, 1 tab, different URL, notificationClickHandlerMatch exact, opens notificaton's URL, event available after", async t => {
  const { worker } = t.context as NotificationClickTestContext;
  const notification = new Notification('title', {
    url: 'https://google.com/new-page'
  });
  const event = NotificationEvent.createMockWithPayload(notification);
  const client = new Client('https://google.com', 'top-level');
  setActiveClients(worker, client);

  const openUrlSpy = sinon.spy(worker.OneSignal, 'openUrl');
  const clientFocusSpy = sinon.spy(client, 'focus');
  const swivelEmitSpy = sinon.spy(worker.OneSignal.swivel, 'emit');

  const result = await worker.OneSignal.onNotificationClicked(event);
  const notifications = await worker.registration.getNotifications();

  t.true(swivelEmitSpy.notCalled);
  t.true(openUrlSpy.calledOnce);
  t.true(clientFocusSpy.notCalled);
  swivelEmitSpy.restore();
  openUrlSpy.restore();
  clientFocusSpy.restore();

  const appState = await worker.OneSignal.database.getAppState();
  const pageClickedNotifications = appState.clickedNotifications[notification.url];
  t.true(pageClickedNotifications.url === notification.url && pageClickedNotifications.timestamp !== null);
});

test("HTTPS, 1 tab, different URL, notificationClickHandlerMatch origin, notificationClickHandlerAction navigate, focuses and navigates and event available after", async t => {
  const { worker } = t.context as NotificationClickTestContext;
  const notification = new Notification('title', {
    url: 'https://google.com/new-page'
  });
  const event = NotificationEvent.createMockWithPayload(notification);
  const client = new Client('https://google.com', 'top-level');
  await setNotificationClickHandlerMatch(worker, 'origin');
  setActiveClients(worker, client);

  const openUrlSpy = sinon.spy(worker.OneSignal, 'openUrl');
  const clientFocusSpy = sinon.spy(client, 'focus');
  const clientNavigateSpy = sinon.spy(client, 'navigate');
  const swivelEmitSpy = sinon.spy(worker.OneSignal.swivel, 'emit');

  const result = await worker.OneSignal.onNotificationClicked(event);
  const notifications = await worker.registration.getNotifications();

  t.true(openUrlSpy.notCalled);
  t.true(clientFocusSpy.calledOnce);
  t.true(clientNavigateSpy.calledOnce);
  swivelEmitSpy.restore();
  openUrlSpy.restore();
  clientFocusSpy.restore();
  clientNavigateSpy.restore();

  const appState = await worker.OneSignal.database.getAppState();
  const pageClickedNotifications = appState.clickedNotifications[notification.url];
  t.true(pageClickedNotifications.url === notification.url && pageClickedNotifications.timestamp !== null);
});

test("HTTPS, 1 tab, different URL, notificationClickHandlerMatch origin, notificationClickHandlerAction focus, only focuses and fires event, event not available after", async t => {  const { worker } = t.context as NotificationClickTestContext;
  const notification = new Notification('title', {
    url: 'https://google.com/new-page'
  });
  const event = NotificationEvent.createMockWithPayload(notification);
  const client = new Client('https://google.com', 'top-level');
  await setNotificationClickHandlerAction(worker, 'focus');
  await setNotificationClickHandlerMatch(worker, 'origin');
  setActiveClients(worker, client);

  const openUrlSpy = sinon.spy(worker.OneSignal, 'openUrl');
  const clientFocusSpy = sinon.spy(client, 'focus');
  const clientNavigateSpy = sinon.spy(client, 'navigate');
  const swivelEmitSpy = sinon.spy(worker.OneSignal.swivel, 'emit');

  const result = await worker.OneSignal.onNotificationClicked(event);
  const notifications = await worker.registration.getNotifications();

  t.true(openUrlSpy.notCalled);
  t.true(clientFocusSpy.calledOnce);
  t.true(clientNavigateSpy.notCalled);
  swivelEmitSpy.restore();
  openUrlSpy.restore();
  clientFocusSpy.restore();
  clientNavigateSpy.restore();

  const appState = await worker.OneSignal.database.getAppState();
  t.is(appState.clickedNotifications[notification.url], undefined);
});

test("HTTP, 1 tab, same URL, focuses and fires event, event is not available after", async t => {
  const { worker } = t.context as NotificationClickTestContext;
  const notification = new Notification('title', {
    url: 'https://google.com'
  });
  const event = NotificationEvent.createMockWithPayload(notification);
  const client = new Client('https://google.com', 'top-level');
  setActiveClients(worker, client);

  const openUrlSpy = sinon.spy(worker.OneSignal, 'openUrl');
  const clientFocusSpy = sinon.spy(client, 'focus');
  const swivelEmitSpy = sinon.spy(worker.OneSignal.swivel, 'emit');

  const result = await worker.OneSignal.onNotificationClicked(event);
  const notifications = await worker.registration.getNotifications();

  t.true(swivelEmitSpy.calledWith(client.id, 'notification.clicked'));
  t.true(openUrlSpy.notCalled);
  t.true(clientFocusSpy.calledOnce);
  swivelEmitSpy.restore();
  openUrlSpy.restore();
  clientFocusSpy.restore();

  const appState = await worker.OneSignal.database.getAppState();
  t.is(appState.clickedNotifications[notification.url], undefined);
});

test.todo('Notification opened, only if opened URL');