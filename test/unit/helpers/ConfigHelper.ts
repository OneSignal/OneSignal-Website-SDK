import '../../support/polyfills/polyfills';
import test from 'ava';
import { TestEnvironment, HttpHttpsEnvironment } from '../../support/sdk/TestEnvironment';
import { ConfigIntegrationKind } from '../../../src/models/AppConfig';
import { AppUserConfig } from '../../../src/models/AppConfig';
import Random from "../../support/tester/Random";
import { ConfigHelper } from '../../../src/helpers/ConfigHelper';
import { DelayedPromptType } from '../../../src/models/Prompts';
import { getFinalAppConfig } from '../../../test/support/tester/ConfigHelperTestHelper';
import sinon, { SinonSandbox } from 'sinon';
import { OneSignalUtils } from '../../../src/utils/OneSignalUtils';

const sandbox: SinonSandbox = sinon.sandbox.create();

test.beforeEach(async () => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });
});

test.afterEach(() => {
  sandbox.restore();
});

test('promptOptions 1 - autoRegister = true backwards compatibility for custom integration (shows native on HTTPS)',
  async t => {
    const fakeUserConfig: AppUserConfig = {
      appId: Random.getRandomUuid(),
      autoRegister: true,
    };

    const appConfig = await getFinalAppConfig(fakeUserConfig);
    const finalPromptOptions = appConfig.userConfig.promptOptions;

    t.is(finalPromptOptions?.native?.enabled, true);
    t.is(finalPromptOptions?.native?.autoPrompt, true);

    t.is(finalPromptOptions?.slidedown?.prompts[0].autoPrompt, false);
    t.is(finalPromptOptions?.autoPrompt, true);
});

test('promptOptions 2 - autoRegister = true backwards compatibility for custom integration (shows slidedown on HTTP)',
  async t => {

    sandbox.stub(OneSignalUtils, "internalIsUsingSubscriptionWorkaround").resolves(true);

    const fakeUserConfig: AppUserConfig = {
      appId: Random.getRandomUuid(),
      autoRegister: true,
    };

    const appConfig = await getFinalAppConfig(fakeUserConfig);
    const finalPromptOptions = appConfig.userConfig.promptOptions;

    t.is(finalPromptOptions?.native?.enabled, false);
    t.is(finalPromptOptions?.native?.autoPrompt, false);

    t.is(finalPromptOptions?.slidedown?.prompts[0].autoPrompt, true);
    t.is(finalPromptOptions?.autoPrompt, true);
});

test('promptOptions 3 - autoRegister = false backwards compatibility for custom integration (no enabled prompts)',
  async t => {

    const fakeUserConfig: AppUserConfig = {
      appId: Random.getRandomUuid(),
      autoRegister: false,
    };

    const appConfig = await getFinalAppConfig(fakeUserConfig);
    const finalPromptOptions = appConfig.userConfig.promptOptions;

    t.is(finalPromptOptions?.native?.enabled, false);
    t.is(finalPromptOptions?.native?.autoPrompt, false);

    t.is(finalPromptOptions?.slidedown?.prompts[0].autoPrompt, false);
    t.is(finalPromptOptions?.autoPrompt, false);
});

test(`promptOptions 4 - autoRegister = true backwards compatibility for custom integration
  (ignores config, shows native on HTTPS)`, async t => {

    const fakeUserConfig: AppUserConfig = {
      appId: Random.getRandomUuid(),
      autoRegister: true,
    };
    (fakeUserConfig as any).promptOptions = {
      slidedown: {
        enabled: true,
      }
    };

    const appConfig = await getFinalAppConfig(fakeUserConfig);
    const finalPromptOptions = appConfig.userConfig.promptOptions;

    t.is(finalPromptOptions?.native?.enabled, true);
    t.is(finalPromptOptions?.native?.autoPrompt, true);

    t.is(finalPromptOptions?.slidedown?.prompts[0].autoPrompt, true);
    t.is(finalPromptOptions?.autoPrompt, true);
});

test(`promptOptions 5 - autoRegister backwards compatibility for custom integration
  (ignores config, shows slidedown on HTTP)`, async t => {

    sandbox.stub(OneSignalUtils, "internalIsUsingSubscriptionWorkaround").resolves(true);

    const fakeUserConfig: AppUserConfig = {
      appId: Random.getRandomUuid(),
      autoRegister: true,
    };

    (fakeUserConfig as any).promptOptions = {
      slidedown: {
        enabled: true,
      }
    };

    const appConfig = await getFinalAppConfig(fakeUserConfig);
    const finalPromptOptions = appConfig.userConfig.promptOptions;

    t.is(finalPromptOptions?.native?.enabled, false);
    t.is(finalPromptOptions?.native?.autoPrompt, false);

    t.is(finalPromptOptions?.slidedown?.prompts[0].autoPrompt, true);
    t.is(finalPromptOptions?.autoPrompt, true);
});

test(`promptOptions 6 - autoRegister = true backwards compatibility for custom integration
  (ignores config, shows native on HTTPS)`, async t => {

    const fakeUserConfig: AppUserConfig = {
      appId: Random.getRandomUuid(),
      autoRegister: true,
    };

    (fakeUserConfig as any).promptOptions = {
      slidedown: {
        enabled: true,
        autoPrompt: false,
      }
    };

    const appConfig = await getFinalAppConfig(fakeUserConfig);
    const finalPromptOptions = appConfig.userConfig.promptOptions;

    t.is(finalPromptOptions?.native?.enabled, true);
    t.is(finalPromptOptions?.native?.autoPrompt, true);

    t.is(finalPromptOptions?.slidedown?.prompts[0].autoPrompt, false);
    t.is(finalPromptOptions?.autoPrompt, true);
});

test(`promptOptions 7 - autoRegister = true backwards compatibility for custom integration
  (ignores config, shows slidedown on HTTP)`, async t => {

  sandbox.stub(OneSignalUtils, "internalIsUsingSubscriptionWorkaround").resolves(true);

  const fakeUserConfig: AppUserConfig = {
    appId: Random.getRandomUuid(),
    autoRegister: true,
  };

  (fakeUserConfig as any).promptOptions = {
    slidedown: {
      enabled: true,
      autoPrompt: false,
    }
  };

  const appConfig = await getFinalAppConfig(fakeUserConfig);
  const finalPromptOptions = appConfig.userConfig.promptOptions;

  t.is(finalPromptOptions?.native?.enabled, false);
  t.is(finalPromptOptions?.native?.autoPrompt, false);

  t.is(finalPromptOptions?.slidedown?.prompts[0].autoPrompt, true);
  t.is(finalPromptOptions?.autoPrompt, true);
});

test(`promptOptions 8 - autoRegister = true backwards compatibility for custom integration
  (ignores config, shows native on HTTPS)`, async t => {

    const fakeUserConfig: AppUserConfig = {
      appId: Random.getRandomUuid(),
      autoRegister: true,
    };

    (fakeUserConfig as any).promptOptions = {
      native: {
        enabled: true,
        autoPrompt: true,
      },
      slidedown: {
        enabled: true,
        autoPrompt: false,
      }
  };

  const appConfig = await getFinalAppConfig(fakeUserConfig);
  const finalPromptOptions = appConfig.userConfig.promptOptions;

  t.is(finalPromptOptions?.native?.enabled, true);
  t.is(finalPromptOptions?.native?.autoPrompt, true);

  t.is(finalPromptOptions?.slidedown?.prompts[0].autoPrompt, false);
  t.is(finalPromptOptions?.autoPrompt, true);
});

test(`promptOptions 9 - autoRegister= true backwards compatibility for custom integration
  (ignores config, shows native on HTTPS)`, async t => {

    const fakeUserConfig: AppUserConfig = {
      appId: Random.getRandomUuid(),
      autoRegister: true,
    };

    (fakeUserConfig as any).promptOptions = {
      native: {
        enabled: true,
        autoPrompt: false,
      },
      slidedown: {
        enabled: true,
        autoPrompt: false,
      }
  };

  const appConfig = await getFinalAppConfig(fakeUserConfig);
  const finalPromptOptions = appConfig.userConfig.promptOptions;

  t.is(finalPromptOptions?.native?.enabled, true);
  t.is(finalPromptOptions?.native?.autoPrompt, true);

  t.is(finalPromptOptions?.slidedown?.prompts[0].autoPrompt, false);
  t.is(finalPromptOptions?.autoPrompt, true);
});

test(`promptOptions 10 - autoRegister backwards compatibility for custom integration
  (ignores config, shows slidedown on HTTP)`, async t => {

    sandbox.stub(OneSignalUtils, "internalIsUsingSubscriptionWorkaround").resolves(true);

    const fakeUserConfig: AppUserConfig = {
      appId: Random.getRandomUuid(),
      autoRegister: true,
    };

    (fakeUserConfig as any).promptOptions = {
      native: {
        enabled: true,
        autoPrompt: false,
      },
      slidedown: {
        enabled: true,
        autoPrompt: false
      }
    };

    const appConfig = await getFinalAppConfig(fakeUserConfig);
    const finalPromptOptions = appConfig.userConfig.promptOptions;

    t.is(finalPromptOptions?.native?.enabled, false);
    t.is(finalPromptOptions?.native?.autoPrompt, false);

    t.is(finalPromptOptions?.slidedown?.prompts[0].autoPrompt, true);
    t.is(finalPromptOptions?.autoPrompt, true);
});

test('autoResubscribe - autoRegister backwards compatibility for custom integration 1', t => {
  const fakeUserConfig: AppUserConfig = {
    appId: Random.getRandomUuid(),
    autoRegister: true,
  };

  const fakeServerConfig = TestEnvironment.getFakeServerAppConfig(ConfigIntegrationKind.Custom);
  const finalConfig = ConfigHelper.getUserConfigForConfigIntegrationKind(
    ConfigIntegrationKind.Custom,
    fakeUserConfig,
    fakeServerConfig
  );
  t.is(finalConfig.autoResubscribe, true);
});

test('autoResubscribe - autoRegister backwards compatibility for custom integration 2', t => {
  const fakeUserConfig: AppUserConfig = {
    appId: Random.getRandomUuid(),
  };

  const fakeServerConfig = TestEnvironment.getFakeServerAppConfig(ConfigIntegrationKind.Custom);
  const finalConfig = ConfigHelper.getUserConfigForConfigIntegrationKind(
    ConfigIntegrationKind.Custom,
    fakeUserConfig,
    fakeServerConfig
  );
  t.is(finalConfig.autoResubscribe, fakeServerConfig.config.autoResubscribe);
});

test('autoResubscribe - autoRegister backwards compatibility for custom integration 3', t => {
  const fakeUserConfig: AppUserConfig = {
    appId: Random.getRandomUuid(),
    autoRegister: false,
    autoResubscribe: true
  };

  const fakeServerConfig = TestEnvironment.getFakeServerAppConfig(ConfigIntegrationKind.Custom);
  const finalConfig = ConfigHelper.getUserConfigForConfigIntegrationKind(
    ConfigIntegrationKind.Custom,
    fakeUserConfig,
    fakeServerConfig
  );
  t.is(finalConfig.autoResubscribe, true);
});
