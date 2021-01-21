import { ContextInterface } from '../../src/models/Context';

export default class PromptsHelper {
  static isCategorySlidedownConfigured(prompts: SlidedownPromptOptions[]): boolean {
    if (!prompts) return false;

    const options = PromptsHelper.getSlidedownPromptOptionsWithType(prompts, DelayedPromptType.Category);
    if (!!options) {
      return (!!options.categories && options.categories.length > 0);
    }
    return false;
  }
  /**
   * Is Category Slidedown Configured (version 1 config schema)
   * @param  {SlidedownOptionsVersion1} options
   * @returns boolean
   */
  static isCategorySlidedownConfiguredVersion1(options: SlidedownOptionsVersion1): boolean {
    return (options?.categories?.tags?.length || 0) > 0;
  }

  static getSlidedownPromptOptionsWithType(prompts: SlidedownPromptOptions[] | undefined, type: DelayedPromptType):
    SlidedownPromptOptions | undefined {
      return prompts ? prompts.filter(options => options.type === type)[0] : undefined;
    }

  static isSlidedownAutoPromptConfigured(prompts: SlidedownPromptOptions[]) : boolean {
    if (!prompts) {
      return false;
    }

    return (!!promptOptions.slidedown.categories.tags && promptOptions.slidedown.categories.tags.length > 0);
  }
}
