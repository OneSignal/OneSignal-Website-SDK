import "../../support/polyfills/polyfills";
import test from "ava";
import Database from "../../../src/services/Database";
import {TestEnvironment} from "../../support/sdk/TestEnvironment";
import OneSignal from "../../../src/OneSignal";
import Random from "../../support/tester/Random";
import ServiceWorker from "../../../src/service-worker/ServiceWorker";
import { Notification } from "../../../src/models/Notification";
import * as sinon from 'sinon';


test("should display 'You have new updates' without a valid backup notification", async t => {
  const worker = await TestEnvironment.stubServiceWorkerEnvironment();
  const displayNotificationSpy = sinon.spy(worker, 'displayNotification');
  await worker.OneSignal.displayBackupNotification();
  t.is((await self.registration.getNotifications())[0].body, 'You have new updates.');
  displayNotificationSpy.restore();
});

test("should display a backup notification if a backup notification is found", async t => {
  const worker = await TestEnvironment.stubServiceWorkerEnvironment();
  const displayNotificationSpy = sinon.spy(worker, 'displayNotification');
  var notification = Notification.createMock('backup notification title');
  worker.OneSignal.database.put('Ids', {type: 'backupNotification', id: notification});
  await worker.OneSignal.displayBackupNotification();
  t.is((await self.registration.getNotifications())[0].body, notification.body);
  displayNotificationSpy.restore();
});