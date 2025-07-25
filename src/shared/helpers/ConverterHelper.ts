import type {
  AppUserConfig,
  SlidedownOptionsVersion1,
} from '../models/AppConfig';
import {
  type AppUserConfigPromptOptions,
  type SlidedownOptions,
  DelayedPromptType,
} from '../models/Prompts';
import PromptsHelper from './PromptsHelper';

export class ConverterHelper {
  /**
   * Standardizes config to version 2 of the config schema
   * @param  {AppUserConfig} userConfig
   */
  public static upgradeConfigToVersionTwo(userConfig: AppUserConfig) {
    if (ConverterHelper.isPromptOptionsVersion0(userConfig.promptOptions)) {
      userConfig.promptOptions = ConverterHelper.convertConfigToVersionOne(
        userConfig.promptOptions,
      );
    }

    if (
      ConverterHelper.isSlidedownConfigVersion1(
        userConfig.promptOptions?.slidedown,
      )
    ) {
      if (userConfig.promptOptions?.slidedown) {
        userConfig.promptOptions.slidedown =
          ConverterHelper.convertConfigToVersionTwo(
            userConfig.promptOptions?.slidedown,
          );
      }
    }
  }

  /**
   * convertConfigToVersionOne - converts v0 schema to v1 schema format
   *
   * v0 schema example
   * ---
   *  promptOptions: {
   *      acceptButtonText: '',
   *      cancelButtonText: '',
   *      actionMessage   : '',
   *      slidedown: {...}
   *  }
   *
   * v1 schema example
   * ---
   * "promptOptions": {
   *    "slidedown": {
   *      "enabled": true,
   *      "autoPrompt": true,
   *      "acceptButtonText": "",
   *      "cancelButtonText": "",
   *      "actionMessage": "",
   *      "...",
   *    }
   * }
   * @param  {any} promptOptions
   * @returns AppUserConfigPromptOptions
   */
  public static convertConfigToVersionOne(
    promptOptions: any,
  ): AppUserConfigPromptOptions {
    if (!promptOptions.slidedown) {
      promptOptions.slidedown = {};
    }

    const { acceptButtonText, cancelButtonText, actionMessage } =
      promptOptions.slidedown;

    // we may have supported both of these keys in the past (with and without "Text" postfix)
    // so we're leaving here and checking in case it is being used this way
    const higherLevelAcceptButtonText =
      promptOptions.acceptButtonText || promptOptions.acceptButton;
    const higherLevelCancelButtonText =
      promptOptions.cancelButtonText || promptOptions.cancelButton;

    /**
     * we should give preference to the lower level ("slidedown" level) text settings in the case that
     * text settings are configured at the higher level as well as the lower level
     *
     * Example:
     * "promptOptions": {
     *      "acceptButtonText": "",
     *      "cancelButtonText": "",
     *      "slidedown": {
     *          "acceptButtonText": "", <--
     *          "cancelButtonText": ""  <--
     *      }
     * }
     */
    promptOptions.slidedown.acceptButtonText =
      acceptButtonText || higherLevelAcceptButtonText;
    promptOptions.slidedown.cancelButtonText =
      cancelButtonText || higherLevelCancelButtonText;
    promptOptions.slidedown.actionMessage =
      actionMessage || promptOptions.actionMessage;

    return promptOptions;
  }

  public static convertConfigToVersionTwo(
    slidedownConfig: SlidedownOptionsVersion1 & SlidedownOptions,
  ): SlidedownOptions {
    // determine if the slidedown is category type or regular push
    const promptType = PromptsHelper.isCategorySlidedownConfiguredVersion1(
      slidedownConfig,
    )
      ? DelayedPromptType.Category
      : DelayedPromptType.Push;

    let positiveUpdateButton, negativeUpdateButton: string | undefined;
    if (promptType === DelayedPromptType.Category) {
      positiveUpdateButton = slidedownConfig.categories?.positiveUpdateButton;
      negativeUpdateButton = slidedownConfig.categories?.negativeUpdateButton;
    }

    const existingPromptsConfig = slidedownConfig.prompts || [];

    return {
      prompts: [
        ...existingPromptsConfig,
        {
          type: promptType,
          autoPrompt: slidedownConfig.autoPrompt,
          text: {
            actionMessage: slidedownConfig.actionMessage,
            acceptButton:
              slidedownConfig.acceptButton || slidedownConfig.acceptButtonText,
            cancelButton:
              slidedownConfig.cancelButton || slidedownConfig.cancelButtonText,
            // categories-specific...
            positiveUpdateButton,
            negativeUpdateButton,
            updateMessage: slidedownConfig?.categories?.updateMessage,
          },
          delay: {
            pageViews: slidedownConfig.pageViews,
            timeDelay: slidedownConfig.timeDelay,
          },
          categories: slidedownConfig?.categories?.tags,
        },
      ],
    } as SlidedownOptions;
  }

  /**
   * For use with Custom Code & Wordpress Implementations
   * The OneSignal Wordpress Plugin still uses these legacy keys to set the slidedown text
   * @param  {any} slidedownConfig
   * @returns boolean
   */
  public static isPromptOptionsVersion0(slidedownConfig: any): boolean {
    if (!!slidedownConfig) {
      const version0Keys = [
        'acceptButtonText',
        'cancelButtonText',
        'actionMessage',
      ];

      for (let i = 0; i < version0Keys.length; i++) {
        // eslint-disable-next-line no-prototype-builtins
        if (slidedownConfig.hasOwnProperty(version0Keys[i])) return true;
      }
    }

    return false;
  }

  /**
   * For use with Custom Code Implementations
   * Checks whether `slidedownConfig` implements `SlidedownOptionsVersion1` interface
   * ------------------------------
   * v1 schema:
   * ----------
   * "slidedown": {
   *    "enabled": true,
   *    "autoPrompt": true,
   *    "...",
   *    "categories": {...}
   * }
   *
   * v2 schema:
   * ----------
   * "slidedown": {
   *    "prompts": [{...}, {...}, {...}]
   * }
   *
   * Since config can also be set via custom-code and we have no strict checks,
   * this function helps to check whether the config implements any v1 style config options
   * by looking for any of the v1 payload first-level keys. See `SlidedownOptionsVersion1`
   * for the full list of keys.
   * @param slidedownConfig
   */
  public static isSlidedownConfigVersion1(
    slidedownConfig: any,
  ): slidedownConfig is SlidedownOptionsVersion1 {
    if (!!slidedownConfig) {
      const version1Keys = [
        'enabled',
        'autoPrompt',
        'pageViews',
        'timeDelay',
        'acceptButton',
        'acceptButtonText',
        'cancelButton',
        'cancelButtonText',
        'actionMessage',
        'customizeTextEnabled',
        'categories',
      ];

      for (let i = 0; i < version1Keys.length; i++) {
        // eslint-disable-next-line no-prototype-builtins
        if (slidedownConfig.hasOwnProperty(version1Keys[i])) return true;
      }
    }
    return false;
  }
}
