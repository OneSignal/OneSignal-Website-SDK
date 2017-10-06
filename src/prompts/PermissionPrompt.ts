import { PermissionPromptResult } from '../models/PermissionPromptResult';
import Context from '../models/Context';
import { PromptManager } from '../managers/PromptManager';

export abstract class PermissionPrompt {
  protected isShowing: boolean;

  /**
   * Returns the friendly name of the permission prompt.
   *
   * Used in checking whether an existing prompt of the same name already exists.
   */
  abstract get name();
  async show() {
    this.isShowing = true;
  }

  async resolve(): Promise<PermissionPromptResult> {
    this.isShowing = false;
    return null;
  }

  async hide() {
    this.isShowing = false;
  }
}
