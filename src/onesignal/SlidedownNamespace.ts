import LocalStorage from "../shared/utils/LocalStorage";
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

   static async showCategorySlidedown(options?: AutoPromptOptions): Promise<void> {
    await awaitOneSignalInitAndSupported();
    const isPushEnabled = LocalStorage.getIsPushNotificationsEnabled();
    await OneSignal.context.promptsManager.internalShowCategorySlidedown({
      ...options,
      isInUpdateMode: isPushEnabled
    });
  }

  static async showSmsSlidedown(options?: AutoPromptOptions): Promise<void> {
    await awaitOneSignalInitAndSupported();
    await OneSignal.context.promptsManager.internalShowSmsSlidedown({
      ...options,
    });
  }

  static async showEmailSlidedown(options?: AutoPromptOptions): Promise<void> {
    await awaitOneSignalInitAndSupported();
    await OneSignal.context.promptsManager.internalShowEmailSlidedown({
      ...options,
    });
  }

  static async showSmsAndEmailSlidedown(options?: AutoPromptOptions): Promise<void> {
    await awaitOneSignalInitAndSupported();
    await OneSignal.context.promptsManager.internalShowSmsAndEmailSlidedown({
      ...options,
    });
  }
}
