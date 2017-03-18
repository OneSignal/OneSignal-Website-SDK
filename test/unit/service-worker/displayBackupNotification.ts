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
  const displayNotificationStub = sinon.spy(worker, 'displayNotification');
  worker.displayBackupNotification();
  t.is(displayNotificationStub.withArgs({
    content: 'You have new updates'
  }).calledOnce, true);
});

test("should display a backup notification if a backup notification is found", async t => {
  const worker = await TestEnvironment.stubServiceWorkerEnvironment();
  const displayNotificationStub = sinon.stub(worker, 'displayNotification');
  worker.database.put('Ids', {type: 'backupNotification', id: Notification.createMock()});
  worker.displayBackupNotification();
  t.is(displayNotificationStub.called, true);
});