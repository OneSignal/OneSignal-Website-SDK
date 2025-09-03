import { APP_ID } from '__test__/constants';
import TestContext from '__test__/support/environment/TestContext';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { getFinalAppConfig } from '__test__/support/helpers/configHelper';
import type { TagCategory } from 'src/page/tags/types';
import { getAppConfig, getMergedConfig } from './app';
import { ConfigIntegrationKind } from './constants';
import {
  getUserConfigForConfigIntegrationKind,
  limitCategoriesToMaxCount,
} from './integration';
import type { AppUserConfig } from './types';

vi.useFakeTimers();

const SERVICE_WORKER_PATH = 'push/onesignal/';

const serverConfig = TestContext.getFakeServerAppConfig(
  ConfigIntegrationKind.Custom,
);

describe('Config Helpers', () => {
  beforeEach(() => {
    TestEnvironment.initialize();
  });

  describe('promptOptions', () => {
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
  });

  describe('autoResubscribe', () => {
    test('autoResubscribe - autoRegister backwards compatibility for custom integration 1', () => {
      const fakeUserConfig: AppUserConfig = {
        appId: APP_ID,
        autoRegister: true,
      };

      const fakeServerConfig = TestContext.getFakeServerAppConfig(
        ConfigIntegrationKind.Custom,
      );
      const finalConfig = getUserConfigForConfigIntegrationKind(
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
      const finalConfig = getUserConfigForConfigIntegrationKind(
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
      const finalConfig = getUserConfigForConfigIntegrationKind(
        ConfigIntegrationKind.Custom,
        fakeUserConfig,
        fakeServerConfig,
      );
      expect(finalConfig.autoResubscribe).toBe(true);
    });
  });

  describe('service worker config', () => {
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

      const finalConfig = getUserConfigForConfigIntegrationKind(
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

      const finalConfig = getUserConfigForConfigIntegrationKind(
        ConfigIntegrationKind.TypicalSite,
        fakeUserConfig,
        fakeServerConfig,
      );

      expect(finalConfig.serviceWorkerPath).toBe('OneSignalSDKWorker.js');
      expect(finalConfig.serviceWorkerParam).toEqual({ scope: '/' });
    });
  });

  test('can get app config', async () => {
    const userConfig = {
      ...TestContext.getFakeAppUserConfig(),
      subdomainName: '',
    };

    const config = await getAppConfig(userConfig);
    const mergedConfig = getMergedConfig(userConfig, serverConfig);

    expect(config).toEqual(mergedConfig);
  });

  test('should limit categories to max count', () => {
    const categories: TagCategory[] = [
      { tag: 'tag1', label: 'label1' },
      { tag: 'tag2', label: 'label2' },
    ];
    const limitedCategories = limitCategoriesToMaxCount(categories, 1);
    expect(limitedCategories).toEqual([{ tag: 'tag1', label: 'label1' }]);
  });
});
