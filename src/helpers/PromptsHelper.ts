export default class PromptsHelper {
  static isCategorySlidedownConfigured(): boolean {
    const { promptOptions } = OneSignal.context.appConfig.userConfig;
    if (!promptOptions) {
      return false;
    }

    const isUsingCategoryOptions = !!promptOptions && !!promptOptions.slidedown && !!promptOptions.slidedown.categories;
    return (
      isUsingCategoryOptions &&
      !!promptOptions.slidedown!.categories!.tags &&
      promptOptions.slidedown!.categories!.tags.length > 0);
  }
}
