import "../../support/polyfills/polyfills";
import test from "ava";
import Database from "../../../src/services/Database";
import {TestEnvironment} from "../../support/sdk/TestEnvironment";
import OneSignal from "../../../src/OneSignal";
import Random from "../../support/tester/Random";
import * as sinon from 'sinon';
import * as swivel from 'swivel';
import ServiceWorkerGlobalScope from '../../support/mocks/service-workers/ServiceWorkerGlobalScope';
import { Notification } from '../../../src/models/Notification';


test("should broadcast notification.dismissed to window clients", async t => {
  const worker = await TestEnvironment.stubServiceWorkerEnvironment();
  const spy = sinon.spy(swivel, 'broadcast');
  const notification = Notification.createMock();
  debugger;
  worker.trigger('notificationclose', notification);
  spy.calledWithMatch('notification.dismissed', notification);
  spy.restore();
});

test("should execute notification.dismissed webhook", async t => {
  const worker = await TestEnvironment.stubServiceWorkerEnvironment();
  const spy = sinon.spy(worker.OneSignal, 'executeWebhooks');
  const notification = Notification.createMock();
  worker.trigger('notificationclose', notification);
  spy.calledWithMatch('notification.dismissed', notification);
  spy.restore();
});