import "../../support/polyfills/polyfills";
import test from "ava";
import { TestEnvironment, HttpHttpsEnvironment } from '../../support/sdk/TestEnvironment';
import OneSignal from "../../../src/onesignal/OneSignal";
import Context from '../../../src/page/models/Context';
import Random from "../../support/tester/Random";

test.beforeEach(async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });

  const appConfig = TestEnvironment.getFakeAppConfig();
  appConfig.appId = Random.getRandomUuid();
  OneSignal.context = new Context(appConfig);
});

test("getNotificationPermission when awaited should not return a Promise", async t => {
  await TestEnvironment.initialize();
  const permission = await OneSignal.getPermissionStatus();
  t.false(permission as any instanceof Promise);
  t.true(permission === "default" ||
    permission === "granted" ||
    permission === "denied");
});

test.cb("getNotificationPermission callback should not return a Promise", t => {
  TestEnvironment.initialize().then(() => {
    OneSignal.getPermissionStatus((permission: any) => {
      t.false(permission instanceof Promise);
      t.true(permission === "default" ||
        permission === "granted" ||
        permission === "denied");
      t.end();
    });
  });
});
