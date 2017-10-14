import "../../support/polyfills/polyfills";
import test from "ava";
import Database from "../../../src/services/Database";
import { TestEnvironment, HttpHttpsEnvironment } from '../../support/sdk/TestEnvironment';
import OneSignal from "../../../src/OneSignal";
import { AppConfig } from '../../../src/models/AppConfig';
import { Uuid } from '../../../src/models/Uuid';
import Context from '../../../src/models/Context';

test.beforeEach(async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });

  const appConfig = new AppConfig();
  appConfig.appId = Uuid.generate();
  OneSignal.context = new Context(appConfig);
});

test("getNotificationPermission when awaited should not return a Promise", async t => {
  await TestEnvironment.initialize();
  const permission = await OneSignal.getNotificationPermission();
  t.false(permission as any instanceof Promise);
  t.true(permission === "default" ||
    permission === "granted" ||
    permission === "denied");
});

test.cb("getNotificationPermission callback should not return a Promise", t => {
  TestEnvironment.initialize().then(() => {
    OneSignal.getNotificationPermission(permission => {
      t.false(permission instanceof Promise);
      t.true(permission === "default" ||
        permission === "granted" ||
        permission === "denied");
      t.end();
    });
  });
});
