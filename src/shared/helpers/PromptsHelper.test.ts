import { DelayedPromptType, SlidedownPromptOptions } from '../models/Prompts';
import PromptsHelper from './PromptsHelper';

describe('PromptsHelper', () => {
  test('should return true if the category slidedown is configured', () => {
    const prompts: SlidedownPromptOptions[] = [
      {
        type: DelayedPromptType.Category,
        text: {
          acceptButton: 'Accept',
          cancelButton: 'Cancel',
          actionMessage: 'Action Message',
        },
        autoPrompt: true,
        categories: [{ tag: 'Tag', label: 'Label' }],
      },
      {
        type: DelayedPromptType.Push,
        text: {
          acceptButton: 'Accept',
          cancelButton: 'Cancel',
          actionMessage: 'Action Message',
        },
        autoPrompt: true,
      },
    ];

    // should return matching prompt
    const result = PromptsHelper.getFirstSlidedownPromptOptionsWithType(
      prompts,
      DelayedPromptType.Push,
    );
    expect(result).toBe(prompts[1]);

    // if no prompts are provided, it should return undefined
    const result2 = PromptsHelper.getFirstSlidedownPromptOptionsWithType(
      undefined,
      DelayedPromptType.Category,
    );
    expect(result2).toBe(undefined);
  });
});
