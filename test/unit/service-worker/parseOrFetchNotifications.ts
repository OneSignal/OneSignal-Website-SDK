import "../../support/polyfills/polyfills";
import test from "ava";
import Database from "../../../src/services/Database";
import {TestEnvironment} from "../../support/sdk/TestEnvironment";
import OneSignal from "../../../src/OneSignal";
import Random from "../../support/tester/Random";
import ServiceWorker from "../../../src/service-worker/ServiceWorker";
import { Notification } from "../../../src/models/Notification";
import * as sinon from 'sinon';
import { PushEvent } from "../../support/mocks/service-workers/utils/events";
import PushMessageData from "../../support/mocks/service-workers/models/PushMessageData";
import OneSignalApi from '../../../src/OneSignalApi';



test("should parse payload given a valid payload", async t => {
  const worker = await TestEnvironment.stubServiceWorkerEnvironment();
  const event = PushEvent.createMockWithPayload();
  const notifications = await worker.parseOrFetchNotifications(event);
  t.is(notifications.length, 1);
  t.deepEqual(notifications[0], event.data.json());
  t.true(Array.isArray(notifications));
});


test("should fetch remote notifications given an invalid payload", async t => {
  const worker = await TestEnvironment.stubServiceWorkerEnvironment();

  const stubGetChromeWebNotification = sinon.stub(OneSignalApi, 'get');
  const fakePayload = [JSON.stringify(
    {
      "custom": {
        "i": "6d7ec82f-bc56-494f-b73a-3a3b48baa2d8"
      },
      "icon": "https://onesignal.com/images/notification_logo.png",
      "alert": "asd",
      "title": "ss"
    }
  )];
  stubGetChromeWebNotification.resolves(fakePayload);
  const event = new PushEvent();
  const notifications = await worker.parseOrFetchNotifications(event);
  t.is(notifications.length, 1);
  t.deepEqual(notifications[0], JSON.parse(fakePayload[0]));
  t.true(Array.isArray(notifications));
});