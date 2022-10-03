import "../../support/polyfills/polyfills";
import test from "ava";
import Database from "../../../src/shared/services/Database";
import Macros from "../../support/tester/Macros";
import { TestEnvironment } from "../../support/sdk/TestEnvironment";
import OneSignal from "../../../src/onesignal/OneSignal";

test("url cannot be null",
     Macros.expectInvalidArgumentError,
     OneSignal.notifications.setDefaultUrl,
     null
);

test("url cannot be empty string",
     Macros.expectInvalidArgumentError,
     OneSignal.notifications.setDefaultUrl,
     '');

test("url cannot be missing protocol",
     Macros.expectInvalidArgumentError,
     OneSignal.notifications.setDefaultUrl,
     'test.com');

test("valid url can be set and retrieved", async t => {
  await TestEnvironment.initialize();
  await OneSignal.notifications.setDefaultUrl("https://test.com");
  const appState = await Database.getAppState();
  t.is(appState.defaultNotificationUrl, 'https://test.com');
});
