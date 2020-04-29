import '../../support/polyfills/polyfills';
import test, { TestContext } from 'ava';
import { TestEnvironment, HttpHttpsEnvironment } from '../../support/sdk/TestEnvironment';
import { ConfigIntegrationKind } from '../../../src/models/AppConfig';
import ConfigManager from '../../../src/managers/ConfigManager';
import { AppUserConfig, AppConfig, ServerAppConfig } from '../../../src/models/AppConfig';
import { AppUserConfigCustomLinkOptions } from '../../../src/models/Prompts';
import Random from '../../support/tester/Random';
import { InitTestHelper } from '../../support/tester/utils';
import sinon, { SinonSandbox } from 'sinon';
import { ConfigHelper } from '../../../src/helpers/ConfigHelper';
import { resetOneSignalInit } from '../helpers/sharedHelpers';

const sinonSandbox: SinonSandbox = sinon.sandbox.create();
const initTestHelper = new InitTestHelper(sinonSandbox);

test.beforeEach(async () => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });
});

test.afterEach(function (_t: TestContext) {
  sinonSandbox.restore();
  resetOneSignalInit();
});

test('can customize initialization options', async t => {
  const fakeUserConfig = TestEnvironment.getFakeAppUserConfig();
  const fakeServerConfig = TestEnvironment.getFakeServerAppConfig(ConfigIntegrationKind.Custom);

  const configManager = new ConfigManager();
  const fakeMergedConfig = configManager.getMergedConfig(
    fakeUserConfig,
    fakeServerConfig
  );

  for (const userConfigKey in Object.keys(fakeUserConfig))
    t.deepEqual(fakeMergedConfig.userConfig[userConfigKey], fakeUserConfig[userConfigKey]);
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

test('should initialize custom link config for typical setup', t => {
  const fakeUserConfig = TestEnvironment.getFakeAppUserConfig();
  const fakeServerConfig = TestEnvironment.getFakeServerAppConfig(ConfigIntegrationKind.TypicalSite);
  const configManager = new ConfigManager();
  const fakeMergedConfig = configManager.getMergedConfig(
    fakeUserConfig,
    fakeServerConfig
  );

  const customLinkConfig: AppUserConfigCustomLinkOptions = {
    enabled: true,
    style: "button",
    size: "medium",
    color: {
      button: "#e54b4d",
      text: "#ffffff",
    },
    text: {
      subscribe: "Subscribe to push notifications",
      unsubscribe: "Unsubscribe from push notifications",
      explanation: "Get updates from all sorts of things that matter to you",
    },
    unsubscribeEnabled: true,
  };
  t.not(fakeMergedConfig.userConfig.promptOptions, undefined);
  if (fakeMergedConfig.userConfig.promptOptions) {
    t.deepEqual(fakeMergedConfig.userConfig.promptOptions.customlink, customLinkConfig);
  }
});

test('should initialize custom link config for custom code setup with correct user config', t => {
  const fakeUserConfig = TestEnvironment.getFakeAppUserConfig();
  const fakeServerConfig = TestEnvironment.getFakeServerAppConfig(ConfigIntegrationKind.Custom);
  const configManager = new ConfigManager();
  const fakeMergedConfig = configManager.getMergedConfig(
    fakeUserConfig,
    fakeServerConfig
  );

  const promptOptions = fakeUserConfig.promptOptions;
  if (!promptOptions) {
    throw new Error('promptOptions cannot be null');
  }

  const customLinkConfig: AppUserConfigCustomLinkOptions | undefined = promptOptions.customlink;
  t.not(fakeMergedConfig.userConfig.promptOptions, undefined);
  if (fakeMergedConfig.userConfig.promptOptions) {
    t.deepEqual(fakeMergedConfig.userConfig.promptOptions.customlink, customLinkConfig);
  }
});

test('should initialize custom link config for custom code setup with incorrect user config', t => {
    const fakeUserConfig = TestEnvironment.getFakeAppUserConfig();
    if (fakeUserConfig.promptOptions) {
      fakeUserConfig.promptOptions.customlink = {
        enabled: true,
      };
    }
    const fakeServerConfig = TestEnvironment.getFakeServerAppConfig(ConfigIntegrationKind.Custom);

    const configManager = new ConfigManager();
    const fakeMergedConfig = configManager.getMergedConfig(
      fakeUserConfig,
      fakeServerConfig
    );

    const customLinkConfig: AppUserConfigCustomLinkOptions = {
      enabled: true,
      style: "button",
      size: "medium",
      color: {
        button: "#e54b4d",
        text: "#ffffff"
      },
      text: {
        subscribe: "Subscribe to push notifications",
        unsubscribe: "Unsubscribe from push notifications",
        explanation: ""
      },
      unsubscribeEnabled: true,
    };
    t.not(fakeMergedConfig.userConfig.promptOptions, undefined);
    if (fakeMergedConfig.userConfig.promptOptions) {
      t.deepEqual(fakeMergedConfig.userConfig.promptOptions.customlink, customLinkConfig);
    }
});

test('should have enableOnSession flag', t => {
  const fakeUserConfig: AppUserConfig = TestEnvironment.getFakeAppUserConfig();
  const fakeServerConfig: ServerAppConfig =
    TestEnvironment.getFakeServerAppConfig(ConfigIntegrationKind.Custom);
  const configManager = new ConfigManager();
  const fakeMergedConfig: AppConfig = configManager.getMergedConfig(
    fakeUserConfig,
    fakeServerConfig
  );

  t.not(fakeMergedConfig.enableOnSession, undefined);
});

/**
 * Check Restricted Origin Tests
 */
test('should match origins', async t => {
  const checkRestrictedOriginSpy = sinonSandbox.spy(ConfigHelper, "checkRestrictedOrigin");
  const doesOriginMatchSpy = sinonSandbox.spy(ConfigHelper, "doesCurrentOriginMatchConfigOrigin");
  sinonSandbox.stub(OneSignal, "delayedInit");
  try{
    await initOneSignalOnUrlWithConfigOrigin("https://example.com", "https://example.com");
  } catch (e) {
    // pass
  }

  t.true(doesOriginMatchSpy.calledOnce);
  t.true(doesOriginMatchSpy.returnValues[0]);
  t.false(checkRestrictedOriginSpy.threw());
});

test('should match origins with www. variant in config', async t => {
  const checkRestrictedOriginSpy = sinonSandbox.spy(ConfigHelper, "checkRestrictedOrigin");
  const doesOriginMatchSpy = sinonSandbox.spy(ConfigHelper, "doesCurrentOriginMatchConfigOrigin");
  sinonSandbox.stub(OneSignal, "delayedInit");
  try{
    await initOneSignalOnUrlWithConfigOrigin("https://example.com", "https://www.example.com");
  } catch (e) {
    // pass
  }

  t.true(doesOriginMatchSpy.calledOnce);
  t.true(doesOriginMatchSpy.returnValues[0]);
  t.false(checkRestrictedOriginSpy.threw());
});

test('should match origins with www. variant on page', async t => {
  const checkRestrictedOriginSpy = sinonSandbox.spy(ConfigHelper, "checkRestrictedOrigin");
  const doesOriginMatchSpy = sinonSandbox.spy(ConfigHelper, "doesCurrentOriginMatchConfigOrigin");
  sinonSandbox.stub(OneSignal, "delayedInit");
  try{
    // allow https for http-configured sites
    await initOneSignalOnUrlWithConfigOrigin("https://www.example.com", "https://example.com");
  } catch (e) {
    // pass
  }

  t.true(doesOriginMatchSpy.calledOnce);
  t.true(doesOriginMatchSpy.returnValues[0]);
  t.false(checkRestrictedOriginSpy.threw());
});

test('should match origins with both www. and https variants in config', async t => {
  const checkRestrictedOriginSpy = sinonSandbox.spy(ConfigHelper, "checkRestrictedOrigin");
  const doesOriginMatchSpy = sinonSandbox.spy(ConfigHelper, "doesCurrentOriginMatchConfigOrigin");
  sinonSandbox.stub(OneSignal, "delayedInit");
  try{
    // allow https for http-configured sites
    await initOneSignalOnUrlWithConfigOrigin("https://example.com", "http://www.example.com");
  } catch (e) {
    // pass
  }

  t.true(doesOriginMatchSpy.calledOnce);
  t.true(doesOriginMatchSpy.returnValues[0]);
  t.false(checkRestrictedOriginSpy.threw());
});

test('should throw if current page origin has weaker protocol', async t => {
  const checkRestrictedOriginSpy = sinonSandbox.spy(ConfigHelper, "checkRestrictedOrigin");
  const doesOriginMatchSpy = sinonSandbox.spy(ConfigHelper, "doesCurrentOriginMatchConfigOrigin");
  sinonSandbox.stub(OneSignal, "delayedInit");
  try{
    // don't allow http for https-configured sites
    await initOneSignalOnUrlWithConfigOrigin("http://example.com", "https://www.example.com");
  } catch (e) {
    // pass
  }

  t.true(doesOriginMatchSpy.calledOnce);
  t.false(doesOriginMatchSpy.returnValues[0]);
  t.true(checkRestrictedOriginSpy.threw());
});

test('should throw if origins do not match', async t => {
  const checkRestrictedOriginSpy = sinonSandbox.spy(ConfigHelper, "checkRestrictedOrigin");
  const doesOriginMatchSpy = sinonSandbox.spy(ConfigHelper, "doesCurrentOriginMatchConfigOrigin");
  sinonSandbox.stub(OneSignal, "delayedInit");
  try{
    await initOneSignalOnUrlWithConfigOrigin("https://site.com", "https://example.com");
  } catch (e) {
    // pass
  }

  t.true(doesOriginMatchSpy.calledOnce);
  t.false(doesOriginMatchSpy.returnValues[0]);
  t.true(checkRestrictedOriginSpy.threw());
});

/**
 * set-up for testing origin limitations and new allowed variants
 */
async function initOneSignalOnUrlWithConfigOrigin(url: string, configOrigin: string) {
  const appId = Random.getRandomUuid();
  const testConfig = {
    httpOrHttps: HttpHttpsEnvironment.Https,
    url: new URL(url)
  };
  const serverConfig = TestEnvironment.getFakeServerAppConfig(
    ConfigIntegrationKind.TypicalSite,
    true,
    {
      features: {
        restrict_origin: { enable: true }
      },
      config: { origin: configOrigin }
    },
    appId
  );

  await TestEnvironment.initialize(testConfig);
  initTestHelper.mockBasicInitEnv(testConfig, serverConfig);
  await OneSignal.init({ appId });
}