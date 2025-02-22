import TestContext from '__test__/support/environment/TestContext';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import Context from 'src/page/models/Context';
import { AppConfig } from '../models/AppConfig';
import Database from '../services/Database';
import InitHelper from './InitHelper';

describe('InitHelper', () => {
  test('correct degree of persistNotification setting should be stored', async () => {
    await TestEnvironment.initialize({
      initOptions: {},
    });

    const appConfig = TestContext.getFakeMergedConfig();
    OneSignal.context = new Context(appConfig);
    OneSignal.config = appConfig;
    const config: AppConfig = OneSignal.config;

    // If not set, default to true
    delete config.userConfig.persistNotification;
    await InitHelper.saveInitOptions();
    let persistNotification = await Database.get(
      'Options',
      'persistNotification',
    );
    expect(persistNotification).toBe(true);

    // If set to false, ensure value is false
    config.userConfig.persistNotification = false;
    await InitHelper.saveInitOptions();
    persistNotification = await Database.get('Options', 'persistNotification');
    expect(persistNotification).toBe(false);

    // If set to true, ensure value is true
    config.userConfig.persistNotification = true;
    await InitHelper.saveInitOptions();
    persistNotification = await Database.get('Options', 'persistNotification');
    expect(persistNotification).toBe(true);
  });
});
