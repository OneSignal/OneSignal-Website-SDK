import "../../support/polyfills/polyfills";
import test from "ava";
import Database from "../../../src/services/Database";
import {TestEnvironment} from "../../support/sdk/TestEnvironment";
import OneSignal from "../../../src/OneSignal";
import Random from "../../support/tester/Random";
import * as sinon from 'sinon';


test("should reject empty null payload", async t => {
  const worker = await TestEnvironment.stubServiceWorkerEnvironment();
  t.false(await worker.isValidPushPayload(null));
});

test("should reject invalid payload", async t => {
  const worker = await TestEnvironment.stubServiceWorkerEnvironment();
  t.false(await worker.isValidPushPayload([1, 2, 3, 4]));
});

test("should reject well-formed but non-OneSignal payload", async t => {
  const worker = await TestEnvironment.stubServiceWorkerEnvironment();
  t.false(await worker.isValidPushPayload({
    custom: {
      i: '12345 not a uuid'
    },
  }));
});

test("should accept valid OneSignal payload", async t => {
  const worker = await TestEnvironment.stubServiceWorkerEnvironment();
  debugger;
  t.true(await worker.isValidPushPayload({
    custom: {
      i: '684df0f3-7064-4be8-9991-c9fb7b0e35fc'
    }
  }));
});