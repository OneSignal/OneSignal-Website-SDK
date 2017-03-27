import "../../support/polyfills/polyfills";
import test from "ava";
import Database from "../../../src/services/Database";
import {TestEnvironment} from "../../support/sdk/TestEnvironment";
import OneSignal from "../../../src/OneSignal";
import Random from "../../support/tester/Random";
import { PushEvent } from '../../support/mocks/service-workers/utils/events';
import * as sinon from 'sinon';


test("should display backup notification, if no notifications found in payload or remote server fetch", async t => {
  const worker = await TestEnvironment.stubServiceWorkerEnvironment();
  const event = PushEvent.createMockWithPayload();

  const spy = sinon.spy(worker.OneSignal, 'displayBackupNotification');

  const result = await worker.OneSignal.onPushReceived(event);
  t.true(spy.calledOnce);
  spy.restore();
});

test.todo("should call self.registration.showNotification");

test.todo("should update the backup notification");

test.todo("should broadcast notification.displayed to window clients");

test.todo("should execute notification.displayed webhook");