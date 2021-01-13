import { ContextInterface } from '../../src/models/Context';
import {
  SlidedownOptions,
  DelayedPromptType,
  SlidedownPromptOptions,
} from '../../src/models/Prompts';

export default class PromptsHelper {
  private context: ContextInterface;

  constructor(context: ContextInterface) {
    this.context = context;
  }

  public isCategorySlidedownConfigured(): boolean {
    const options = this.getSlidedownPromptOptionsWithType(DelayedPromptType.Category);
    if (!!options) {
      return (!!options.categories && options.categories.length > 0);
    }
    return false;
  }

  public getSlidedownPromptOptionsWithType(type: DelayedPromptType):
   SlidedownPromptOptions {
    const { prompts } = this.context.appConfig.userConfig.promptOptions?.slidedown as SlidedownOptions;
    return PromptsHelper.getSlidedownPromptOptionsWithType(prompts, type);
  }

  static getSlidedownPromptOptionsWithType(prompts: SlidedownPromptOptions[], type: DelayedPromptType):
    SlidedownPromptOptions {
      return prompts.filter(options => options.type === type)[0];
    }

  static isSlidedownAutoPromptConfigured(prompts: SlidedownPromptOptions[]) : boolean {
    for (let i=0; i<prompts.length; i++) {
      if (prompts[i].autoPrompt) return true;
    }
    return false;
  }
}
