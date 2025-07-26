import { APP_ID } from '__test__/support/constants';
import { ConfigHelper } from '../../../src/shared/helpers/ConfigHelper';
import {
  type AppUserConfig,
  ConfigIntegrationKind,
} from '../../../src/shared/models/AppConfig';
import TestContext from '../../support/environment/TestContext';
import { TestEnvironment } from '../../support/environment/TestEnvironment';
import { getFinalAppConfig } from '../../support/helpers/configHelper';

const SERVICE_WORKER_PATH = 'push/onesignal/';

describe('ConfigHelper Tests', () => {
  beforeEach(async () => {
    await TestEnvironment.initialize();
    vi.spyOn(ConfigHelper, 'checkRestrictedOrigin').mockReturnValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('promptOptions 1 - autoRegister = true backwards compatibility for custom integration shows native on HTTPS', async () => {
    const fakeUserConfig: AppUserConfig = {
      appId: APP_ID,
      autoRegister: true,
    };

    const appConfig = await getFinalAppConfig(fakeUserConfig);
    const finalPromptOptions = appConfig.userConfig.promptOptions;

    expect(finalPromptOptions?.native?.enabled).toBe(true);
    expect(finalPromptOptions?.native?.autoPrompt).toBe(true);

    expect(finalPromptOptions?.slidedown?.prompts[0].autoPrompt).toBe(false);
    expect(finalPromptOptions?.autoPrompt).toBe(true);
  });

  test('promptOptions 3 - autoRegister = false backwards compatibility for custom integration (no enabled prompts)', async () => {
    const fakeUserConfig: AppUserConfig = {
      appId: APP_ID,
      autoRegister: false,
    };

    const appConfig = await getFinalAppConfig(fakeUserConfig);
    const finalPromptOptions = appConfig.userConfig.promptOptions;

    expect(finalPromptOptions?.native?.enabled).toBe(false);
    expect(finalPromptOptions?.native?.autoPrompt).toBe(false);

    expect(finalPromptOptions?.slidedown?.prompts[0].autoPrompt).toBe(false);
    expect(finalPromptOptions?.autoPrompt).toBe(false);
  });

  test(`promptOptions 4 - autoRegister = true backwards compatibility for custom integration (ignores config, shows native on HTTPS)`, async () => {
    const fakeUserConfig: AppUserConfig = {
      appId: APP_ID,
      autoRegister: true,
    };
    (fakeUserConfig as any).promptOptions = {
      slidedown: {
        enabled: true,
      },
    };

    const appConfig = await getFinalAppConfig(fakeUserConfig);
    const finalPromptOptions = appConfig.userConfig.promptOptions;

    expect(finalPromptOptions?.native?.enabled).toBe(true);
    expect(finalPromptOptions?.native?.autoPrompt).toBe(true);

    expect(finalPromptOptions?.slidedown?.prompts[0].autoPrompt).toBe(true);
    expect(finalPromptOptions?.autoPrompt).toBe(true);
  });

  test(`promptOptions 6 - autoRegister = true backwards compatibility for custom integration (ignores config, shows native on HTTPS)`, async () => {
    const fakeUserConfig: AppUserConfig = {
      appId: APP_ID,
      autoRegister: true,
    };

    (fakeUserConfig as any).promptOptions = {
      slidedown: {
        enabled: true,
        autoPrompt: false,
      },
    };

    const appConfig = await getFinalAppConfig(fakeUserConfig);
    const finalPromptOptions = appConfig.userConfig.promptOptions;

    expect(finalPromptOptions?.native?.enabled).toBe(true);
    expect(finalPromptOptions?.native?.autoPrompt).toBe(true);

    expect(finalPromptOptions?.slidedown?.prompts[0].autoPrompt).toBe(false);
    expect(finalPromptOptions?.autoPrompt).toBe(true);
  });

  test(`promptOptions 8 - autoRegister = true backwards compatibility for custom integration (ignores config, shows native on HTTPS)`, async () => {
    const fakeUserConfig: AppUserConfig = {
      appId: APP_ID,
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
      },
    };

    const appConfig = await getFinalAppConfig(fakeUserConfig);
    const finalPromptOptions = appConfig.userConfig.promptOptions;

    expect(finalPromptOptions?.native?.enabled).toBe(true);
    expect(finalPromptOptions?.native?.autoPrompt).toBe(true);

    expect(finalPromptOptions?.slidedown?.prompts[0].autoPrompt).toBe(false);
    expect(finalPromptOptions?.autoPrompt).toBe(true);
  });

  test(`promptOptions 9 - autoRegister = true backwards compatibility for custom integration (ignores config, shows native on HTTPS)`, async () => {
    const fakeUserConfig: AppUserConfig = {
      appId: APP_ID,
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
      },
    };

    const appConfig = await getFinalAppConfig(fakeUserConfig);
    const finalPromptOptions = appConfig.userConfig.promptOptions;

    expect(finalPromptOptions?.native?.enabled).toBe(true);
    expect(finalPromptOptions?.native?.autoPrompt).toBe(true);

    expect(finalPromptOptions?.slidedown?.prompts[0].autoPrompt).toBe(false);
    expect(finalPromptOptions?.autoPrompt).toBe(true);
  });

  test('autoResubscribe - autoRegister backwards compatibility for custom integration 1', () => {
    const fakeUserConfig: AppUserConfig = {
      appId: APP_ID,
      autoRegister: true,
    };

    const fakeServerConfig = TestContext.getFakeServerAppConfig(
      ConfigIntegrationKind.Custom,
    );
    const finalConfig = ConfigHelper.getUserConfigForConfigIntegrationKind(
      ConfigIntegrationKind.Custom,
      fakeUserConfig,
      fakeServerConfig,
    );
    expect(finalConfig.autoResubscribe).toBe(true);
  });

  test('autoResubscribe - autoRegister backwards compatibility for custom integration 2', () => {
    const fakeUserConfig: AppUserConfig = {
      appId: APP_ID,
    };

    const fakeServerConfig = TestContext.getFakeServerAppConfig(
      ConfigIntegrationKind.Custom,
    );
    const finalConfig = ConfigHelper.getUserConfigForConfigIntegrationKind(
      ConfigIntegrationKind.Custom,
      fakeUserConfig,
      fakeServerConfig,
    );
    expect(finalConfig.autoResubscribe).toBe(
      fakeServerConfig.config.autoResubscribe,
    );
  });

  test('autoResubscribe - autoRegister backwards compatibility for custom integration 3', () => {
    const fakeUserConfig: AppUserConfig = {
      appId: APP_ID,
      autoRegister: false,
      autoResubscribe: true,
    };

    const fakeServerConfig = TestContext.getFakeServerAppConfig(
      ConfigIntegrationKind.Custom,
    );
    const finalConfig = ConfigHelper.getUserConfigForConfigIntegrationKind(
      ConfigIntegrationKind.Custom,
      fakeUserConfig,
      fakeServerConfig,
    );
    expect(finalConfig.autoResubscribe).toBe(true);
  });

  test('service worker config override (true) for typical site works', () => {
    const fakeUserConfig: AppUserConfig = {
      appId: APP_ID,
      serviceWorkerParam: { scope: '/' + SERVICE_WORKER_PATH },
      serviceWorkerPath: SERVICE_WORKER_PATH + 'OneSignalSDKWorker.js',
      serviceWorkerOverrideForTypical: true,
    };

    const fakeServerConfig = TestContext.getFakeServerAppConfig(
      ConfigIntegrationKind.TypicalSite,
    );

    const finalConfig = ConfigHelper.getUserConfigForConfigIntegrationKind(
      ConfigIntegrationKind.TypicalSite,
      fakeUserConfig,
      fakeServerConfig,
    );

    expect(finalConfig.serviceWorkerPath).toBe(
      'push/onesignal/OneSignalSDKWorker.js',
    );
    expect(finalConfig.serviceWorkerParam).toEqual({
      scope: '/push/onesignal/',
    });
  });

  test('service worker config override (false) for typical site works', () => {
    const fakeUserConfig: AppUserConfig = {
      appId: APP_ID,
      serviceWorkerParam: { scope: '/' + SERVICE_WORKER_PATH },
      serviceWorkerPath: SERVICE_WORKER_PATH + 'OneSignalSDKWorker.js',
      serviceWorkerOverrideForTypical: false,
    };

    const fakeServerConfig = TestContext.getFakeServerAppConfig(
      ConfigIntegrationKind.TypicalSite,
    );

    const finalConfig = ConfigHelper.getUserConfigForConfigIntegrationKind(
      ConfigIntegrationKind.TypicalSite,
      fakeUserConfig,
      fakeServerConfig,
    );

    expect(finalConfig.serviceWorkerPath).toBe('OneSignalSDKWorker.js');
    expect(finalConfig.serviceWorkerParam).toEqual({ scope: '/' });
  });
});
