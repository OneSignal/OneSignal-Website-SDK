import "../../support/polyfills/polyfills";
import test from "ava";
import Database from "../../../src/services/Database";
import Macros from "../../support/tester/Macros";
import {TestEnvironment} from "../../support/sdk/TestEnvironment";
import OneSignal from "../../../src/OneSignal";
import { Subscription } from '../../../src/models/Subscription';
import { Uuid } from '../../../src/models/Uuid';
import { InvalidArgumentError } from '../../../src/errors/InvalidArgumentError';

test("setEmail should reject an empty or invalid emails", async t => {
    await TestEnvironment.initialize();
  try {
    await OneSignal.setEmail(undefined);
    t.fail('expected exception not caught');
  } catch (e) {
    t.truthy(e instanceof InvalidArgumentError);
  }

  try {
    await OneSignal.setEmail(null);
    t.fail('expected exception not caught');
  } catch (e) {
    t.truthy(e instanceof InvalidArgumentError);
  }

  try {
    await OneSignal.setEmail(null);
    t.fail('expected exception not caught');
  } catch (e) {
    t.truthy(e instanceof InvalidArgumentError);
  }

  try {
    await OneSignal.setEmail("test@@example.com");
    t.fail('expected exception not caught');
  } catch (e) {
    t.truthy(e instanceof InvalidArgumentError);
  }
});

test("setEmail should not accept an email auth SHA-256 hex hash not 64 characters long", async t => {
  await TestEnvironment.initialize();
  try {
    await OneSignal.setEmail("test@example.com", {
      emailAuthHash: "12345"
    });
    t.fail('expected exception not caught');
  } catch (e) {
    t.truthy(e instanceof InvalidArgumentError);
  }
});

// test("setEmail should reject an invalid email", async t => {
//   await TestEnvironment.initialize();

//   OneSignal.setEmail()

//   const subscription = new Subscription();
//   subscription.deviceId = new Uuid('f7cf25b7-246a-42a1-8c40-eb8eae19cc9e');
//   await OneSignal.database.setSubscription(subscription);
//   const userIdByPromise = await OneSignal.getUserId()
//   const userIdByCallback = await new Promise(resolve => {
//     OneSignal.getUserId(resolve)
//   });
//   t.is(userIdByPromise, 'f7cf25b7-246a-42a1-8c40-eb8eae19cc9e');
//   t.is(userIdByCallback, 'f7cf25b7-246a-42a1-8c40-eb8eae19cc9e');
// });
