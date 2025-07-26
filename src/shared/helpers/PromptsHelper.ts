import {
  DelayedPromptType,
  type DelayedPromptTypeValue,
  type SlidedownPromptOptions,
} from '../prompts';

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

  static getFirstSlidedownPromptOptionsWithType(
    prompts: SlidedownPromptOptions[] | undefined,
    type: DelayedPromptTypeValue,
  ): SlidedownPromptOptions | undefined {
    return prompts
      ? prompts.filter((options) => options.type === type)[0]
      : undefined;
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
