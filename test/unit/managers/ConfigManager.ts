import '../../support/polyfills/polyfills';
import test from 'ava';
import { TestEnvironment, HttpHttpsEnvironment } from '../../support/sdk/TestEnvironment';
import CookieSyncer from '../../../src/modules/CookieSyncer';
import OneSignal from '../../../src/OneSignal';
import MainHelper from '../../../src/helpers/MainHelper';
import sinon from 'sinon';
import SubscriptionHelper from '../../../src/helpers/SubscriptionHelper';
import { SubscriptionManager } from '../../../src/managers/SubscriptionManager';
import { AppConfig, ConfigIntegrationKind, NotificationClickMatchBehavior, NotificationClickActionBehavior, AppUserConfig } from '../../../src/models/AppConfig';

import Context from '../../../src/models/Context';
import ConfigManager from '../../../src/managers/ConfigManager';

test.beforeEach(async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });
});

test('can customize initialization options', async t => {
  const fakeUserConfig = TestEnvironment.getFakeAppUserConfig();
  const fakeServerConfig = TestEnvironment.getFakeServerAppConfig(ConfigIntegrationKind.Custom);

  const configManager = new ConfigManager();
  const fakeMergedConfig = configManager.getMergedConfig(
    fakeUserConfig,
    fakeServerConfig
  );

  for (const userConfigKey in Object.keys(fakeUserConfig)) {
    t.deepEqual(fakeMergedConfig.userConfig[userConfigKey], fakeUserConfig[userConfigKey]);
  }
});

test('should use server-provided subdomain if enabled', async t => {
  const fakeUserConfig = TestEnvironment.getFakeAppUserConfig();
  const fakeServerConfig = TestEnvironment.getFakeServerAppConfig(ConfigIntegrationKind.TypicalSite);
  fakeServerConfig.config.integration.kind = ConfigIntegrationKind.TypicalSite;
  fakeServerConfig.config.siteInfo.proxyOriginEnabled = true;
  fakeServerConfig.config.siteInfo.proxyOrigin = "some-subdomain";

  const configManager = new ConfigManager();
  const fakeMergedConfig = configManager.getMergedConfig(
    fakeUserConfig,
    fakeServerConfig
  );

  t.deepEqual(fakeMergedConfig.subdomain, "some-subdomain");
});

test('should not use server-provided subdomain if not enabled', async t => {
  const fakeUserConfig = TestEnvironment.getFakeAppUserConfig();
  const fakeServerConfig = TestEnvironment.getFakeServerAppConfig(ConfigIntegrationKind.TypicalSite);
  fakeServerConfig.config.integration.kind = ConfigIntegrationKind.TypicalSite;
  fakeServerConfig.config.siteInfo.proxyOriginEnabled = false;
  fakeServerConfig.config.siteInfo.proxyOrigin = "some-subdomain";

  const configManager = new ConfigManager();
  const fakeMergedConfig = configManager.getMergedConfig(
    fakeUserConfig,
    fakeServerConfig
  );

  t.deepEqual(fakeMergedConfig.subdomain, undefined);
});
