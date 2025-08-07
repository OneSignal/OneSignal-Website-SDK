import { DelayedPromptType } from './constants';
import type { DelayedPromptTypeValue, SlidedownPromptOptions } from './types';

export function isCategorySlidedownConfigured(
  prompts?: SlidedownPromptOptions[],
): boolean {
  if (!prompts) return false;

  const options = getFirstSlidedownPromptOptionsWithType(
    prompts,
    DelayedPromptType.Category,
  );
  if (!!options) {
    return !!options.categories && options.categories.length > 0;
  }
  return false;
}

export function getFirstSlidedownPromptOptionsWithType(
  prompts: SlidedownPromptOptions[] | undefined,
  type: DelayedPromptTypeValue,
): SlidedownPromptOptions | undefined {
  return prompts
    ? prompts.filter((options) => options.type === type)[0]
    : undefined;
}

export function isSlidedownPushDependent(
  slidedownType: DelayedPromptTypeValue,
): boolean {
  return (
    slidedownType === DelayedPromptType.Push ||
    slidedownType === DelayedPromptType.Category
  );
}
