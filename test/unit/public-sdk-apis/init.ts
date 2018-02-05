import "../../support/polyfills/polyfills";
import test, { TestContext } from "ava";
import Database from "../../../src/services/Database";
import Macros from "../../support/tester/Macros";
import { TestEnvironment, HttpHttpsEnvironment } from '../../support/sdk/TestEnvironment';
import OneSignal from "../../../src/OneSignal";
import Context from '../../../src/models/Context';
import InitHelper from '../../../src/helpers/InitHelper';
import { AppConfig } from '../../../src/models/AppConfig';
import ConfigManager from '../../../src/managers/ConfigManager';
import { Uuid } from '../../../src/models/Uuid';
import * as nock from 'nock';
import { SessionManager } from "../../../src/managers/SessionManager";

test("correct degree of persistNotification setting should be stored", async t => {
  await TestEnvironment.initialize({
    initOptions: { },
    httpOrHttps: HttpHttpsEnvironment.Https
  });

  const appConfig = TestEnvironment.getFakeAppConfig();
  OneSignal.context = new Context(appConfig);
  OneSignal.config = appConfig;
  const config: AppConfig = OneSignal.config;

  {
    /*
      If unspecified, persistNotification defaults to true on non-Mac OS X
      environments, and false on Mac OS X due to changes in Chrome 59 limiting
      web push notification content lengths.
     */
    delete config.userConfig.persistNotification;
    await InitHelper.saveInitOptions();
    const persistNotification = await Database.get('Options', 'persistNotification');
    t.true(persistNotification);
  }

  {
    /*
      If set to false, persistNotification is false on all environments.
      */
    config.userConfig.persistNotification = false;
    await InitHelper.saveInitOptions();
    const persistNotification = await Database.get('Options', 'persistNotification');
    t.false(persistNotification);
  }

  {
    /*
      If explicitly set to true, persistNotification is true on all environments.
      */
    config.userConfig.persistNotification = true;
    await InitHelper.saveInitOptions();
    const persistNotification = await Database.get('Options', 'persistNotification');
    t.is(persistNotification, 'force');
  }
});

async function expectUserSessionCountUpdateRequest(
  t: TestContext,
  pushDevicePlayerId: Uuid,
) {
  nock('https://onesignal.com')
    .post(`/api/v1/players/${pushDevicePlayerId.value}/on_session`)
    .reply(200, (uri, requestBody) => {
      // Not matching for anything yet, because no email-specific data is sent here
      // Just a whole bunch of params like timezone, os, sdk version..etc.
      return { "success":true };
    });
}

test("email session should be updated on first page view", async t => {
  const testData = {
    pushDevicePlayerId: Uuid.generate()
  };
  await TestEnvironment.initialize();

  const sessionManager = new SessionManager();
  const appConfig = TestEnvironment.getFakeAppConfig();
  OneSignal.context = new Context(appConfig);
  OneSignal.config = appConfig;
  const config: AppConfig = OneSignal.config;
  OneSignal.context.sessionManager = sessionManager;
  // Ensure this is true, that way email on_session gets run
  sessionManager.setPageViewCount(1);
  t.true(sessionManager.isFirstPageView());

  expectUserSessionCountUpdateRequest(t, testData.pushDevicePlayerId);

  await InitHelper.updateEmailSessionCount();
});
