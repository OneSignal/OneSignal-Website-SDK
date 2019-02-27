import '../../support/polyfills/polyfills';
import test from 'ava';
import { TestEnvironment, HttpHttpsEnvironment } from '../../support/sdk/TestEnvironment';
import { ConfigIntegrationKind } from '../../../src/models/AppConfig';
import { AppUserConfig } from '../../../src/models/AppConfig';
import Random from "../../support/tester/Random";
import { ConfigHelper } from '../../../src/helpers/ConfigHelper';

test.beforeEach(async () => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });
});

test('promptOptions - autoRegister backwards compatibility for custom integration 1', t => {
  const fakeUserConfig: AppUserConfig = {
    appId: Random.getRandomUuid(),
    autoRegister: true,
  };

  const fakeServerConfig = TestEnvironment.getFakeServerAppConfig(ConfigIntegrationKind.Custom);
  const finalPromptOptions = ConfigHelper.injectDefaultsIntoPromptOptions(
    fakeUserConfig.promptOptions,
    fakeServerConfig.config.staticPrompts,
    fakeUserConfig
  );

  if (!finalPromptOptions) {
    throw new Error("Prompt options cannot be empty!");
  }

  t.is(finalPromptOptions!.native!.enabled, true);
  t.is(finalPromptOptions!.native!.autoPrompt, true);

  t.is(finalPromptOptions!.slidedown!.enabled, false);
  t.is(finalPromptOptions!.slidedown!.autoPrompt, false);

  t.is(finalPromptOptions.autoPrompt, true);
});

test('promptOptions - autoRegister backwards compatibility for custom integration 2', t => {
  const fakeUserConfig: AppUserConfig = {
    appId: Random.getRandomUuid(),
    autoRegister: false,
  };

  const fakeServerConfig = TestEnvironment.getFakeServerAppConfig(ConfigIntegrationKind.Custom);
  const finalPromptOptions = ConfigHelper.injectDefaultsIntoPromptOptions(
    fakeUserConfig.promptOptions,
    fakeServerConfig.config.staticPrompts,
    fakeUserConfig
  );

  if (!finalPromptOptions) {
    throw new Error("Prompt options cannot be empty!");
  }

  t.is(finalPromptOptions!.native!.enabled, false);
  t.is(finalPromptOptions!.native!.autoPrompt, false);
  
  t.is(finalPromptOptions!.slidedown!.enabled, false);
  t.is(finalPromptOptions!.slidedown!.autoPrompt, false);

  t.is(finalPromptOptions.autoPrompt, false);
});

test('promptOptions - autoRegister backwards compatibility for custom integration 3', t => {
  const fakeUserConfig: AppUserConfig = {
    appId: Random.getRandomUuid(),
    autoRegister: true,
  };
  (fakeUserConfig as any).promptOptions = {
    slidedown: {
      enabled: true,
    }
  };

  const fakeServerConfig = TestEnvironment.getFakeServerAppConfig(ConfigIntegrationKind.Custom);
  const finalPromptOptions = ConfigHelper.injectDefaultsIntoPromptOptions(
    fakeUserConfig.promptOptions,
    fakeServerConfig.config.staticPrompts,
    fakeUserConfig
  );

  if (!finalPromptOptions) {
    throw new Error("Prompt options cannot be empty!");
  }

  t.is(finalPromptOptions!.native!.enabled, false);
  t.is(finalPromptOptions!.native!.autoPrompt, false);
  
  t.is(finalPromptOptions!.slidedown!.enabled, true);
  t.is(finalPromptOptions!.slidedown!.autoPrompt, true);

  t.is(finalPromptOptions.autoPrompt, true);
});

test('promptOptions - autoRegister backwards compatibility for custom integration 4', t => {
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

  const fakeServerConfig = TestEnvironment.getFakeServerAppConfig(ConfigIntegrationKind.Custom);
  const finalPromptOptions = ConfigHelper.injectDefaultsIntoPromptOptions(
    fakeUserConfig.promptOptions,
    fakeServerConfig.config.staticPrompts,
    fakeUserConfig
  );

  if (!finalPromptOptions) {
    throw new Error("Prompt options cannot be empty!");
  }

  t.is(finalPromptOptions!.native!.enabled, true);
  t.is(finalPromptOptions!.native!.autoPrompt, true);
  
  t.is(finalPromptOptions!.slidedown!.enabled, true);
  t.is(finalPromptOptions!.slidedown!.autoPrompt, false);

  t.is(finalPromptOptions.autoPrompt, true);
});

test('promptOptions - autoRegister backwards compatibility for custom integration 5', t => {
  const fakeUserConfig: AppUserConfig = {
    appId: Random.getRandomUuid(),
    autoRegister: true,
  };
  (fakeUserConfig as any).promptOptions = {
    native: {
      enabled: true,
    },
    slidedown: {
      enabled: true,
      autoPrompt: false,
    }
  };

  const fakeServerConfig = TestEnvironment.getFakeServerAppConfig(ConfigIntegrationKind.Custom);
  const finalPromptOptions = ConfigHelper.injectDefaultsIntoPromptOptions(
    fakeUserConfig.promptOptions,
    fakeServerConfig.config.staticPrompts,
    fakeUserConfig
  );

  if (!finalPromptOptions) {
    throw new Error("Prompt options cannot be empty!");
  }

  t.is(finalPromptOptions!.native!.enabled, true);
  t.is(finalPromptOptions!.native!.autoPrompt, true);

  t.is(finalPromptOptions!.slidedown!.enabled, true);
  t.is(finalPromptOptions!.slidedown!.autoPrompt, false);

  t.is(finalPromptOptions.autoPrompt, true);
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
  t.is(finalConfig.autoResubscribe, false);
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
