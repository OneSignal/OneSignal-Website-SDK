import type { SlidedownOptionsVersion1 } from '../models/AppConfig';
import {
  DelayedPromptType,
  type DelayedPromptTypeValue,
  type SlidedownPromptOptions,
} from '../models/Prompts';

export default class PromptsHelper {
  static isCategorySlidedownConfigured(
    prompts?: SlidedownPromptOptions[],
  ): boolean {
    if (!prompts) return false;

    const options = PromptsHelper.getFirstSlidedownPromptOptionsWithType(
      prompts,
      DelayedPromptType.Category,
    );
    if (!!options) {
      return !!options.categories && options.categories.length > 0;
    }
    return false;
  }
  /**
   * Is Category Slidedown Configured (version 1 config schema)
   * @param  {SlidedownOptionsVersion1} options
   * @returns boolean
   */
  static isCategorySlidedownConfiguredVersion1(
    options?: SlidedownOptionsVersion1,
  ): boolean {
    return (options?.categories?.tags?.length || 0) > 0;
  }

  static getFirstSlidedownPromptOptionsWithType(
    prompts: SlidedownPromptOptions[] | undefined,
    type: DelayedPromptTypeValue,
  ): SlidedownPromptOptions | undefined {
    return prompts
      ? prompts.filter((options) => options.type === type)[0]
      : undefined;
  }

  static isSlidedownAutoPromptConfigured(
    prompts: SlidedownPromptOptions[],
  ): boolean {
    if (!prompts) {
      return false;
    }

    for (let i = 0; i < prompts.length; i++) {
      if (prompts[i].autoPrompt) return true;
    }
    return false;
  }

  static isSlidedownPushDependent(
    slidedownType: DelayedPromptTypeValue,
  ): boolean {
    return (
      slidedownType === DelayedPromptType.Push ||
      slidedownType === DelayedPromptType.Category
    );
  }
}
