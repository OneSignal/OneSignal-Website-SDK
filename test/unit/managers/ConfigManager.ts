import '../../support/polyfills/polyfills';
import test from 'ava';
import { TestEnvironment } from '../../support/sdk/TestEnvironment';
import {
  ConfigIntegrationKind,
  AppUserConfig,
  ServerAppConfig,
  AppConfig,
} from '../../../src/shared/models/AppConfig';
import { AppUserConfigCustomLinkOptions } from '../../../src/shared/models/Prompts';
import ConfigManager from '../../../src/page/managers/ConfigManager';

test.beforeEach(async () => {
  await TestEnvironment.initialize();
});

test('can customize initialization options', async (t) => {
  const fakeUserConfig = TestEnvironment.getFakeAppUserConfig();
  const fakeServerConfig = TestEnvironment.getFakeServerAppConfig(
    ConfigIntegrationKind.Custom,
  );

  const configManager = new ConfigManager();
  const fakeMergedConfig = configManager.getMergedConfig(
    fakeUserConfig,
    fakeServerConfig,
  );

  for (const userConfigKey in Object.keys(fakeUserConfig))
    t.deepEqual(
      fakeMergedConfig.userConfig[userConfigKey],
      fakeUserConfig[userConfigKey],
    );
});

test('should use server-provided subdomain if enabled', async (t) => {
  const fakeUserConfig = TestEnvironment.getFakeAppUserConfig();
  const fakeServerConfig = TestEnvironment.getFakeServerAppConfig(
    ConfigIntegrationKind.TypicalSite,
  );
  fakeServerConfig.config.integration.kind = ConfigIntegrationKind.TypicalSite;
  fakeServerConfig.config.siteInfo.proxyOriginEnabled = true;
  fakeServerConfig.config.siteInfo.proxyOrigin = 'some-subdomain';

  const configManager = new ConfigManager();
  const fakeMergedConfig = configManager.getMergedConfig(
    fakeUserConfig,
    fakeServerConfig,
  );

  t.deepEqual(fakeMergedConfig.hasUnsupportedSubdomain, true);
});

test('should not use server-provided subdomain if not enabled', async (t) => {
  const fakeUserConfig = TestEnvironment.getFakeAppUserConfig();
  const fakeServerConfig = TestEnvironment.getFakeServerAppConfig(
    ConfigIntegrationKind.TypicalSite,
  );
  fakeServerConfig.config.integration.kind = ConfigIntegrationKind.TypicalSite;
  fakeServerConfig.config.siteInfo.proxyOriginEnabled = false;
  fakeServerConfig.config.siteInfo.proxyOrigin = 'some-subdomain';

  const configManager = new ConfigManager();
  const fakeMergedConfig = configManager.getMergedConfig(
    fakeUserConfig,
    fakeServerConfig,
  );

  t.deepEqual(fakeMergedConfig.hasUnsupportedSubdomain, false);
});

test('should initialize custom link config for typical setup', (t) => {
  const fakeUserConfig = TestEnvironment.getFakeAppUserConfig();
  const fakeServerConfig = TestEnvironment.getFakeServerAppConfig(
    ConfigIntegrationKind.TypicalSite,
  );
  const configManager = new ConfigManager();
  const fakeMergedConfig = configManager.getMergedConfig(
    fakeUserConfig,
    fakeServerConfig,
  );

  const customLinkConfig: AppUserConfigCustomLinkOptions = {
    enabled: true,
    style: 'button',
    size: 'medium',
    color: {
      button: '#e54b4d',
      text: '#ffffff',
    },
    text: {
      subscribe: 'Subscribe to push notifications',
      unsubscribe: 'Unsubscribe from push notifications',
      explanation: 'Get updates from all sorts of things that matter to you',
    },
    unsubscribeEnabled: true,
  };
  t.not(fakeMergedConfig.userConfig.promptOptions, undefined);
  if (fakeMergedConfig.userConfig.promptOptions) {
    t.deepEqual(
      fakeMergedConfig.userConfig.promptOptions.customlink,
      customLinkConfig,
    );
  }
});

test('should initialize custom link config for custom code setup with correct user config', (t) => {
  const fakeUserConfig = TestEnvironment.getFakeAppUserConfig();
  const fakeServerConfig = TestEnvironment.getFakeServerAppConfig(
    ConfigIntegrationKind.Custom,
  );
  const configManager = new ConfigManager();
  const fakeMergedConfig = configManager.getMergedConfig(
    fakeUserConfig,
    fakeServerConfig,
  );

  const promptOptions = fakeUserConfig.promptOptions;
  if (!promptOptions) {
    throw new Error('promptOptions cannot be null');
  }

  const customLinkConfig: AppUserConfigCustomLinkOptions | undefined =
    promptOptions.customlink;
  t.not(fakeMergedConfig.userConfig.promptOptions, undefined);
  if (fakeMergedConfig.userConfig.promptOptions) {
    t.deepEqual(
      fakeMergedConfig.userConfig.promptOptions.customlink,
      customLinkConfig,
    );
  }
});

test('should initialize custom link config for custom code setup with incorrect user config', (t) => {
  const fakeUserConfig = TestEnvironment.getFakeAppUserConfig();
  if (fakeUserConfig.promptOptions) {
    fakeUserConfig.promptOptions.customlink = {
      enabled: true,
    };
  }
  const fakeServerConfig = TestEnvironment.getFakeServerAppConfig(
    ConfigIntegrationKind.Custom,
  );

  const configManager = new ConfigManager();
  const fakeMergedConfig = configManager.getMergedConfig(
    fakeUserConfig,
    fakeServerConfig,
  );

  const customLinkConfig: AppUserConfigCustomLinkOptions = {
    enabled: true,
    style: 'button',
    size: 'medium',
    color: {
      button: '#e54b4d',
      text: '#ffffff',
    },
    text: {
      subscribe: 'Subscribe to push notifications',
      unsubscribe: 'Unsubscribe from push notifications',
      explanation: '',
    },
    unsubscribeEnabled: true,
  };
  t.not(fakeMergedConfig.userConfig.promptOptions, undefined);
  if (fakeMergedConfig.userConfig.promptOptions) {
    t.deepEqual(
      fakeMergedConfig.userConfig.promptOptions.customlink,
      customLinkConfig,
    );
  }
});

test('should have enableOnSession flag', (t) => {
  const fakeUserConfig: AppUserConfig = TestEnvironment.getFakeAppUserConfig();
  const fakeServerConfig: ServerAppConfig =
    TestEnvironment.getFakeServerAppConfig(ConfigIntegrationKind.Custom);
  const configManager = new ConfigManager();
  const fakeMergedConfig: AppConfig = configManager.getMergedConfig(
    fakeUserConfig,
    fakeServerConfig,
  );

  t.not(fakeMergedConfig.enableOnSession, undefined);
});
