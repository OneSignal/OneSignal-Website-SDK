import '../../support/polyfills/polyfills';
import test from 'ava';
import { TestEnvironment, HttpHttpsEnvironment } from '../../support/sdk/TestEnvironment';
import CookieSyncer from '../../../src/modules/CookieSyncer';
import OneSignal from '../../../src/OneSignal';
import MainHelper from '../../../src/helpers/MainHelper';
import * as sinon from 'sinon';
import SubscriptionHelper from '../../../src/helpers/SubscriptionHelper';
import { SubscriptionManager } from '../../../src/managers/SubscriptionManager';
import { AppConfig, IntegrationKind, NotificationClickMatchBehavior, NotificationClickActionBehavior, AppUserConfig } from '../../../src/models/AppConfig';
import { Uuid } from '../../../src/models/Uuid';
import Context from '../../../src/models/Context';
import ConfigManager from '../../../src/managers/ConfigManager';

test.beforeEach(async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });
});

test('can customize initialization options', async t => {
  const fakeUserConfig = TestEnvironment.getFakeAppUserConfig();
  const fakeServerConfig = TestEnvironment.getFakeServerAppConfig();

  const configManager = new ConfigManager();
  const fakeMergedConfig = configManager.getMergedConfig(
    fakeUserConfig,
    fakeServerConfig
  );

  // console.warn('----------------------------------------------');
  // console.warn("User Config:", fakeUserConfig);
  // console.warn('----------------------------------------------');
  // console.warn("Server Config:", fakeServerConfig);
  // console.warn('----------------------------------------------');
  // console.warn("Merged Config:", fakeMergedConfig);
  // console.warn('----------------------------------------------');
  // console.warn("Merged Config:", fakeMergedConfig.userConfig.promptOptions);

  for (const userConfigKey in Object.keys(fakeUserConfig)) {
    t.deepEqual(fakeMergedConfig.userConfig[userConfigKey], fakeUserConfig[userConfigKey]);
  }
});
