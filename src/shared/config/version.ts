import { DelayedPromptType } from '../prompts/constants';
import type {
  AppUserConfigPromptOptions,
  SlidedownOptions,
  SlidedownOptionsVersion1,
} from '../prompts/types';
import type { AppUserConfig } from './types';

/**
 * Standardizes config to version 2 of the config schema
 * @param  {AppUserConfig} userConfig
 */
export function upgradeConfigToVersionTwo(userConfig: AppUserConfig) {
  if (isPromptOptionsVersion0(userConfig.promptOptions)) {
    userConfig.promptOptions = convertConfigToVersionOne(
      userConfig.promptOptions,
    );
  }

  if (isSlidedownConfigVersion1(userConfig.promptOptions?.slidedown)) {
    if (userConfig.promptOptions?.slidedown) {
      userConfig.promptOptions.slidedown = convertConfigToVersionTwo(
        userConfig.promptOptions?.slidedown,
      );
    }
  }
}

/**
 * For use with Custom Code & Wordpress Implementations
 * The OneSignal Wordpress Plugin still uses these legacy keys to set the slidedown text
 * @param  {any} slidedownConfig
 * @returns boolean
 */
function isPromptOptionsVersion0(slidedownConfig: unknown): boolean {
  if (!slidedownConfig) return false;

  const version0Keys = [
    'acceptButtonText',
    'cancelButtonText',
    'actionMessage',
  ];

  return version0Keys.some((key) =>
    Object.prototype.hasOwnProperty.call(slidedownConfig, key),
  );
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
function convertConfigToVersionOne(
  promptOptions: any,
): AppUserConfigPromptOptions {
  if (!promptOptions.slidedown) {
    promptOptions.slidedown = {};
  }

  const { slidedown } = promptOptions;

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
  slidedown.acceptButtonText =
    slidedown.acceptButtonText ??
    promptOptions.acceptButtonText ??
    promptOptions.acceptButton;

  slidedown.cancelButtonText =
    slidedown.cancelButtonText ??
    promptOptions.cancelButtonText ??
    promptOptions.cancelButton;

  slidedown.actionMessage =
    slidedown.actionMessage ?? promptOptions.actionMessage;

  return promptOptions;
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
function isSlidedownConfigVersion1(
  slidedownConfig: any,
): slidedownConfig is SlidedownOptionsVersion1 {
  if (!slidedownConfig) return false;

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
  ] as const;

  return version1Keys.some((key) =>
    Object.prototype.hasOwnProperty.call(slidedownConfig, key),
  );
}

function convertConfigToVersionTwo(
  slidedownConfig: SlidedownOptionsVersion1 & SlidedownOptions,
): SlidedownOptions {
  const isCategory = isCategorySlidedownConfiguredVersion1(slidedownConfig);
  const promptType = isCategory
    ? DelayedPromptType.Category
    : DelayedPromptType.Push;

  const { categories, prompts = [] } = slidedownConfig;

  const newPrompt = {
    type: promptType,
    autoPrompt: slidedownConfig.autoPrompt,
    text: {
      actionMessage: slidedownConfig.actionMessage,
      acceptButton:
        slidedownConfig.acceptButton ?? slidedownConfig.acceptButtonText,
      cancelButton:
        slidedownConfig.cancelButton ?? slidedownConfig.cancelButtonText,
      ...(isCategory && {
        positiveUpdateButton: categories?.positiveUpdateButton,
        negativeUpdateButton: categories?.negativeUpdateButton,
        updateMessage: categories?.updateMessage,
      }),
    },
    delay: {
      pageViews: slidedownConfig.pageViews,
      timeDelay: slidedownConfig.timeDelay,
    },
    categories: categories?.tags,
  };

  return {
    prompts: [...prompts, newPrompt],
  } as SlidedownOptions;
}

/**
 * Is Category Slidedown Configured (version 1 config schema)
 * @param  {SlidedownOptionsVersion1} options
 * @returns boolean
 */
function isCategorySlidedownConfiguredVersion1(
  options?: SlidedownOptionsVersion1,
): boolean {
  return (options?.categories?.tags?.length || 0) > 0;
}
