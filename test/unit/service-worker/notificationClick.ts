import "../../support/polyfills/polyfills";
import test from "ava";
import Database from "../../../src/services/Database";
import { TestEnvironment, ServiceWorkerTestEnvironment } from '../../support/sdk/TestEnvironment';
import OneSignal from "../../../src/OneSignal";
import Random from "../../support/tester/Random";
import { PushEvent, NotificationEvent } from '../../support/mocks/service-workers/utils/events';
import * as sinon from 'sinon';

interface NotificationClickTestContext {
  worker: ServiceWorkerTestEnvironment,
  event: NotificationEvent
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

test.todo("should call self.registration.showNotification");

test.todo("should update the backup notification");

test.todo("should broadcast notification.displayed to window clients");

test.todo("should execute notification.displayed webhook");