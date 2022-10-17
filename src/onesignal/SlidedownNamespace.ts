import { AutoPromptOptions } from "../page/managers/PromptsManager";
import { DelayedPromptType } from "../shared/models/Prompts";
import { awaitOneSignalInitAndSupported } from "../shared/utils/utils";

export default class SlidedownNamespace {
  /**
   * Shows a sliding modal prompt on the page for users.
   * @PublicApi
   */
  static async showSlidedownPrompt(options?: AutoPromptOptions): Promise<void> {
    await awaitOneSignalInitAndSupported();
    await OneSignal.context.promptsManager.internalShowParticularSlidedown(DelayedPromptType.Push, options);
  }
}