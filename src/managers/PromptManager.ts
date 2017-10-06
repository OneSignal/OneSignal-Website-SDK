import { PermissionPrompt } from '../prompts/PermissionPrompt';
import { PermissionPromptResult } from '../models/PermissionPromptResult';

export interface PromptManagerConfig {
}

export class PromptManager {

  private activePrompts: { string: boolean };

  constructor() {
    this.activePrompts = {} as any;
  }

  public async prompt(prompt: PermissionPrompt): Promise<PermissionPromptResult> {
    await prompt.show();
    this.setPromptActive(prompt, true);
    const activePromptValues = Object.keys(this.activePrompts).map(promptName => this.activePrompts[promptName]);
    const result = await prompt.resolve();
    this.setPromptActive(prompt, false);
    return result;
  }

  public isAnyPromptActive() {
    const activePromptValues = Object.keys(this.activePrompts).map(promptName => this.activePrompts[promptName]);
    return activePromptValues.filter(isActive => isActive === true).length > 0;
  }

  public setPromptActive(prompt: PermissionPrompt, isActive: boolean) {
    this.activePrompts[prompt.name] = isActive;
  }
}
