import "../../support/polyfills/polyfills";
import test from "ava";
import Database from "../../../src/services/Database";
import {TestEnvironment} from "../../support/sdk/TestEnvironment";
import OneSignal from "../../../src/OneSignal";
import Random from "../../support/tester/Random";


test("should ignore magic strings and magic query parameters", async t => {
  const worker = await TestEnvironment.stubServiceWorkerEnvironment();
  t.false(worker.OneSignal.shouldOpenNotificationUrl('javascript:void(0);'));
  t.false(worker.OneSignal.shouldOpenNotificationUrl('do_not_open'));
  t.false(worker.OneSignal.shouldOpenNotificationUrl('_osp=do_not_open'));
});

test("should open notification URLs that do not contain magic strings", async t => {
  const worker = await TestEnvironment.stubServiceWorkerEnvironment();
  t.true(worker.OneSignal.shouldOpenNotificationUrl('https://www.google.com'));
  t.true(worker.OneSignal.shouldOpenNotificationUrl('google.com'));
  t.true(worker.OneSignal.shouldOpenNotificationUrl(''));
  t.true(worker.OneSignal.shouldOpenNotificationUrl('abcde'));
});