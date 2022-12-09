import LocalStorage from "../shared/utils/LocalStorage";
import { AutoPromptOptions } from "../page/managers/PromptsManager";
import { DelayedPromptType } from "../shared/models/Prompts";
import { awaitOneSignalInitAndSupported } from "../shared/utils/utils";
import OneSignal from "./OneSignal";

export default class SlidedownNamespace {
  /**
   * Shows a sliding modal prompt on the page for users.
   * @PublicApi
   */
  async promptPush(options?: AutoPromptOptions): Promise<void> {
    await awaitOneSignalInitAndSupported();
    await OneSignal.context.promptsManager.internalShowParticularSlidedown(DelayedPromptType.Push, options);
  }

   async promptPushCategories(options?: AutoPromptOptions): Promise<void> {
    await awaitOneSignalInitAndSupported();
    const isPushEnabled = LocalStorage.getIsPushNotificationsEnabled();
    await OneSignal.context.promptsManager.internalShowCategorySlidedown({
      ...options,
      isInUpdateMode: isPushEnabled
    });
  }

  async promptSms(options?: AutoPromptOptions): Promise<void> {
    await awaitOneSignalInitAndSupported();
    await OneSignal.context.promptsManager.internalShowSmsSlidedown({
      ...options,
    });
  }

  async promptEmail(options?: AutoPromptOptions): Promise<void> {
    await awaitOneSignalInitAndSupported();
    await OneSignal.context.promptsManager.internalShowEmailSlidedown({
      ...options,
    });
  }

  async promptSmsAndEmail(options?: AutoPromptOptions): Promise<void> {
    await awaitOneSignalInitAndSupported();
    await OneSignal.context.promptsManager.internalShowSmsAndEmailSlidedown({
      ...options,
    });
  }
}
