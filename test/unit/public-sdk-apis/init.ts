import "../../support/polyfills/polyfills";
import test from "ava";
import Database from "../../../src/services/Database";
import Macros from "../../support/tester/Macros";
import { TestEnvironment, HttpHttpsEnvironment } from '../../support/sdk/TestEnvironment';
import OneSignal from "../../../src/OneSignal";
import Context from '../../../src/models/Context';
import InitHelper from '../../../src/helpers/InitHelper';
import { AppConfig } from '../../../src/models/AppConfig';
import ConfigManager from '../../../src/managers/ConfigManager';

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
