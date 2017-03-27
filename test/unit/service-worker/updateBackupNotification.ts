import "../../support/polyfills/polyfills";
import test from "ava";
import Database from "../../../src/services/Database";
import {TestEnvironment} from "../../support/sdk/TestEnvironment";
import OneSignal from "../../../src/OneSignal";
import Random from "../../support/tester/Random";
import { Notification } from '../../../src/models/Notification';


test("should ignore welcome notifications", async t => {
  const worker = await TestEnvironment.stubServiceWorkerEnvironment();
  const notification = Notification.createMock({
    data: {
      __isOneSignalWelcomeNotification: true
    }
  });
  await worker.OneSignal.updateBackupNotification(notification);
  const backupNotification = await worker.OneSignal.database.get<Notification>('Ids', 'backupNotification');
  t.is(backupNotification, null);
});

test("should update backup notification", async t => {
  const worker = await TestEnvironment.stubServiceWorkerEnvironment();
  const notification = Notification.createMock({
    title: 'My title',
    body: 'Some body'
  });
  await worker.OneSignal.updateBackupNotification(notification);
  const backupNotification = await worker.OneSignal.database.get<Notification>('Ids', 'backupNotification');
  t.deepEqual(backupNotification, notification);
});