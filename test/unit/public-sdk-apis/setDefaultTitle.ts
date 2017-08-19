import "../../support/polyfills/polyfills";
import test from "ava";
import Database from "../../../src/services/Database";
import {TestEnvironment} from "../../support/sdk/TestEnvironment";
import OneSignal from "../../../src/OneSignal";


test("title can be null", async t => {
  await TestEnvironment.initialize();
  await OneSignal.setDefaultTitle(null);
  const appState = await Database.getAppState();
  t.is(appState.defaultNotificationTitle, null);
});

test("title can be empty", async t => {
  await TestEnvironment.initialize();
  await OneSignal.setDefaultTitle('');
  const appState = await Database.getAppState();
  t.is(appState.defaultNotificationTitle, '');
});

test("title can be some text", async t => {
  await TestEnvironment.initialize();
  await OneSignal.setDefaultTitle('My notification title');
  const appState = await Database.getAppState();
  t.is(appState.defaultNotificationTitle, 'My notification title');
});
