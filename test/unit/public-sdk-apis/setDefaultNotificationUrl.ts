import "../../support/polyfills/polyfills";
import test from "ava";
import Database from "../../../src/services/Database";
import Macros from "../../support/tester/Macros";
import {TestEnvironment} from "../../support/sdk/TestEnvironment";
import OneSignal from "../../../src/OneSignal";

test("url cannot be null",
     Macros.expectInvalidArgumentError,
     OneSignal.setDefaultNotificationUrl,
     null
);

test("url cannot be empty string",
     Macros.expectInvalidArgumentError,
     OneSignal.setDefaultNotificationUrl,
     '');

test("url cannot be missing protocol",
     Macros.expectInvalidArgumentError,
     OneSignal.setDefaultNotificationUrl,
     'test.com');

test("valid url can be set and retrieved", async t => {
  await TestEnvironment.initialize();
  await OneSignal.setDefaultNotificationUrl("https://test.com");
  const appState = await Database.getAppState();
  t.is(appState.defaultNotificationUrl, 'https://test.com');
});
