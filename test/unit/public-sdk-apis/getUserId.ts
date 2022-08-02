import "../../support/polyfills/polyfills";
import test from "ava";
import { TestEnvironment } from "../../support/sdk/TestEnvironment";
import OneSignalPublic from "../../../src/onesignal/OneSignalPublic";
import { Subscription } from '../../../src/shared/models/Subscription';

test("getUserId should return the correct string", async t => {
  await TestEnvironment.initialize();
  const subscription = new Subscription();
  subscription.deviceId = 'f7cf25b7-246a-42a1-8c40-eb8eae19cc9e';
  await OneSignalPublic.database.setSubscription(subscription);
  const userIdByPromise = await OneSignalPublic.getUserId()
  const userIdByCallback = await new Promise(resolve => {
    OneSignalPublic.getUserId(resolve)
  });
  t.is(userIdByPromise, 'f7cf25b7-246a-42a1-8c40-eb8eae19cc9e');
  t.is(userIdByCallback, 'f7cf25b7-246a-42a1-8c40-eb8eae19cc9e');
});
