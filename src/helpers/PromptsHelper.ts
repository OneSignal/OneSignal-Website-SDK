import { ContextInterface } from '../../src/models/Context';

export default class PromptsHelper {
  static isCategorySlidedownConfigured(context: ContextInterface): boolean {
    const { promptOptions } = context.appConfig.userConfig;
    if (!promptOptions || !promptOptions.slidedown || !promptOptions.slidedown.categories) {
      return false;
    }

    return (!!promptOptions.slidedown.categories.tags && promptOptions.slidedown.categories.tags.length > 0);
  }
}
