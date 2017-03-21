import "../../support/polyfills/polyfills";
import test from "ava";
import Database from "../../../src/services/Database";
import {TestEnvironment} from "../../support/sdk/TestEnvironment";
import OneSignal from "../../../src/OneSignal";
import Random from "../../support/tester/Random";
import ServiceWorker from "../../../src/service-worker/ServiceWorker";
import { Notification } from "../../../src/models/Notification";
import * as sinon from 'sinon';
import Environment from "../../../src/Environment";


test("should detect a Service Worker environment", async t => {
  const worker = await TestEnvironment.stubServiceWorkerEnvironment();
  t.true(Environment.getEnv() === Environment.SERVICE_WORKER);
});