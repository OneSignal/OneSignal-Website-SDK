
import '../../support/polyfills/polyfills';
import test from 'ava';
import { TestEnvironment, HttpHttpsEnvironment } from '../../support/sdk/TestEnvironment';
import { AppUserConfig } from '../../../src/models/AppConfig';
import Random from "../../support/tester/Random";
import { AppUserConfigPromptOptions, DelayedPromptType } from '../../../src/models/Prompts';
import { getFinalAppConfig } from '../../../test/support/tester/ConfigHelperTestHelper';
import sinon, { SinonSandbox } from 'sinon';
import PromptsHelper from '../../../src/helpers/PromptsHelper';

const sandbox: SinonSandbox = sinon.sandbox.create();

test.beforeEach(async () => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });
});

test.afterEach(() => {
  sandbox.restore();
});

test("supports version 0 of config schema (converts to version 2)", async t => {
    const fakeUserConfig: AppUserConfig = {
      appId: Random.getRandomUuid(),
      autoRegister: false,
      autoResubscribe: true
    };

    (fakeUserConfig as any).promptOptions = {
      actionMessage: "Custom message",
      acceptButtonText: "Custom accept button",
      cancelButtonText: "Custom cancel button",
      slidedown: {
        autoPrompt: true,
        enabled: true,
      }
    };
    const appConfig = await getFinalAppConfig(fakeUserConfig);
    const promptOptions = appConfig.userConfig.promptOptions?.slidedown?.prompts[0];

    t.is(promptOptions?.type, DelayedPromptType.Push);
    t.is(promptOptions?.text.acceptButton, "Custom accept button");
    t.is(promptOptions?.text.cancelButton, "Custom cancel button");
    t.is(promptOptions?.text.actionMessage, "Custom message");
  });

  test(`config using both v0 and v1 schemas should use v1 version`, async t => {
    const fakeUserConfig: AppUserConfig = {
      appId: Random.getRandomUuid(),
      autoRegister: false,
      autoResubscribe: true
    };

    (fakeUserConfig as any).promptOptions = {
      actionMessage: "", // should ignore
      acceptButtonText: "", // should ignore
      cancelButtonText: "", // should ignore
      slidedown: {
        autoPrompt: true,
        enabled: true,
        actionMessage: "Custom message",
        acceptButtonText: "Custom accept button",
        cancelButtonText: "Custom cancel button",
      }
    };
    const appConfig = await getFinalAppConfig(fakeUserConfig);
    const promptOptions = appConfig.userConfig.promptOptions?.slidedown?.prompts[0];

    t.is(promptOptions?.type, DelayedPromptType.Push);
    t.is(promptOptions?.text.acceptButton, "Custom accept button");
    t.is(promptOptions?.text.cancelButton, "Custom cancel button");
    t.is(promptOptions?.text.actionMessage, "Custom message");
});

  test(`supports version 0 of config schema (converts to version 2) - using alternative text keys ` +
    `without "Text" postfix - slidedown type is 'push'`, async t => {
    const fakeUserConfig: AppUserConfig = {
      appId: Random.getRandomUuid(),
      autoRegister: false,
      autoResubscribe: true
    };

    (fakeUserConfig as any).promptOptions = {
      actionMessage: "Custom message",
      acceptButton: "Custom accept button",
      cancelButton: "Custom cancel button",
      slidedown: {
        autoPrompt: true,
        enabled: true,
      }
    };
    const appConfig = await getFinalAppConfig(fakeUserConfig);
    const promptOptions = appConfig.userConfig.promptOptions?.slidedown?.prompts[0];

    t.is(promptOptions?.type, DelayedPromptType.Push);
    t.is(promptOptions?.delay?.pageViews, 1);
    t.is(promptOptions?.delay?.timeDelay, 0);
    t.is(promptOptions?.autoPrompt, true);
    t.is(promptOptions?.text.acceptButton, "Custom accept button");
    t.is(promptOptions?.text.cancelButton, "Custom cancel button");
    t.is(promptOptions?.text.actionMessage, "Custom message");
  });

  test("supports version 1 of config schema (converts to version 2) - slidedown type is 'push'", async t => {
    const fakeUserConfig: AppUserConfig = {
      appId: Random.getRandomUuid(),
      autoRegister: false,
      autoResubscribe: true
    };

    (fakeUserConfig as any).promptOptions = {
      slidedown: {
        autoPrompt: true,
        enabled: true,
      }
    };
    const appConfig = await getFinalAppConfig(fakeUserConfig);
    const promptOptions = appConfig.userConfig.promptOptions?.slidedown?.prompts[0];

    t.is(promptOptions?.type, DelayedPromptType.Push);
    t.is(promptOptions?.delay?.pageViews, 1);
    t.is(promptOptions?.delay?.timeDelay, 0);
    t.is(promptOptions?.autoPrompt, true);
    t.is(promptOptions?.text.acceptButton, "Allow");
    t.is(promptOptions?.text.cancelButton, "Cancel");
    t.is(promptOptions?.text.actionMessage, "We'd like to show you notifications for the latest news and updates.");
  });

  test("supports version 1 of config schema (converts to version 2) - type is 'category'", async t => {
    const fakeUserConfig: AppUserConfig = {};

    (fakeUserConfig as any).promptOptions = {
      slidedown: {
          autoPrompt: false,
          enabled: true,
          categories: {
              positiveUpdateButton: "Howdy, yes",
              negativeUpdateButton: "Cancelar",
              tags: [
                {
                    tag: "politics",
                    label: "Politics",
                },
                {
                    tag: "usa_news",
                    label: "USA News",
                },
              ]
          }
      }
    };
    const appConfig = await getFinalAppConfig(fakeUserConfig);
    const promptOptions = appConfig.userConfig.promptOptions?.slidedown?.prompts[0];

    t.is(promptOptions?.type, DelayedPromptType.Category);
    t.is(promptOptions?.delay?.pageViews, 1);
    t.is(promptOptions?.delay?.timeDelay, 0);
    t.is(promptOptions?.autoPrompt, false);
    t.is(promptOptions?.text.positiveUpdateButton, "Howdy, yes");
    t.is(promptOptions?.text.negativeUpdateButton, "Cancelar");
    t.is(promptOptions?.text.actionMessage, "We'd like to show you notifications for the latest news and updates.");
  });

  test("converter handles case where some settings are set in v1 format and others in v2", async t => {
    const fakeUserConfig: AppUserConfig = {
      appId: Random.getRandomUuid(),
      autoRegister: false,
      autoResubscribe: true
    };

    (fakeUserConfig as any).promptOptions = {
      slidedown: {
            acceptButtonText: "Custom Accept",
            cancelButtonText: "Custom Cancel",
            actionMessage:  "Custom Action Message",
            autoPrompt: true,
            enabled: true,
            prompts: [{
                type: DelayedPromptType.Category,
                autoPrompt: false,
                text: {
                    acceptButton: "Category Accept",
                    cancelButton: "Category Cancel",
                    actionMessage: "Category Action Message"
                },
                categories: [{ tag: "Tag", label: "Label" }]
            }]
      }
    } as AppUserConfigPromptOptions;

    const appConfig = await getFinalAppConfig(fakeUserConfig);
    const promptOptionsArray = appConfig.userConfig.promptOptions?.slidedown?.prompts;
    const pushPrompt = PromptsHelper.getFirstSlidedownPromptOptionsWithType(promptOptionsArray, DelayedPromptType.Push);
    const categoryPrompt =
        PromptsHelper.getFirstSlidedownPromptOptionsWithType(promptOptionsArray, DelayedPromptType.Category);

    t.is(promptOptionsArray?.length, 2);
    t.not(pushPrompt, undefined);
    t.not(categoryPrompt, undefined);
    t.is(pushPrompt?.text.acceptButton, "Custom Accept");
    t.is(pushPrompt?.text.cancelButton, "Custom Cancel");
    t.is(pushPrompt?.text.actionMessage, "Custom Action Message");
    t.is(categoryPrompt?.text.acceptButton, "Category Accept");
    t.is(categoryPrompt?.text.cancelButton, "Category Cancel");
    t.is(categoryPrompt?.text.actionMessage, "Category Action Message");

  });