import { DelayedPromptType } from './constants';
import { getFirstSlidedownPromptOptionsWithType } from './helpers';
import type { SlidedownPromptOptions } from './types';

describe('Prompt Helpers', () => {
  test('should return true if the category slidedown is configured', () => {
    const prompts: SlidedownPromptOptions[] = [
      {
        type: DelayedPromptType._Category,
        text: {
          acceptButton: 'Accept',
          cancelButton: 'Cancel',
          actionMessage: 'Action Message',
        },
        autoPrompt: true,
        categories: [{ tag: 'Tag', label: 'Label' }],
      },
      {
        type: DelayedPromptType._Push,
        text: {
          acceptButton: 'Accept',
          cancelButton: 'Cancel',
          actionMessage: 'Action Message',
        },
        autoPrompt: true,
      },
    ];

    // should return matching prompt
    const result = getFirstSlidedownPromptOptionsWithType(
      prompts,
      DelayedPromptType._Push,
    );
    expect(result).toBe(prompts[1]);

    // if no prompts are provided, it should return undefined
    const result2 = getFirstSlidedownPromptOptionsWithType(
      undefined,
      DelayedPromptType._Category,
    );
    expect(result2).toBe(undefined);
  });
});
