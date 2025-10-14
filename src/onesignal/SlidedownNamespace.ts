import { isConsentRequiredButNotGiven } from 'src/shared/database/config';
import type { AutoPromptOptions } from '../page/managers/PromptsManager';
import { EventListenerBase } from '../page/userModel/EventListenerBase';
import { DelayedPromptType } from '../shared/prompts/constants';
import { awaitOneSignalInitAndSupported } from '../shared/utils/utils';
export default class SlidedownNamespace extends EventListenerBase {
  constructor() {
    super();
  }

  /**
   * Shows a sliding modal prompt on the page for users.
   * @PublicApi
   */
  async promptPush(options?: AutoPromptOptions): Promise<void> {
    if (isConsentRequiredButNotGiven()) return;
    await awaitOneSignalInitAndSupported();
    await OneSignal._context.promptsManager.internalShowParticularSlidedown(
      DelayedPromptType._Push,
      options,
    );
  }

  async promptPushCategories(options?: AutoPromptOptions): Promise<void> {
    if (isConsentRequiredButNotGiven()) return;
    await awaitOneSignalInitAndSupported();
    const isPushEnabled =
      await OneSignal._context._subscriptionManager.isPushNotificationsEnabled();
    await OneSignal._context.promptsManager.internalShowCategorySlidedown({
      ...options,
      isInUpdateMode: isPushEnabled,
    });
  }

  async promptSms(options?: AutoPromptOptions): Promise<void> {
    if (isConsentRequiredButNotGiven()) return;
    await awaitOneSignalInitAndSupported();
    await OneSignal._context.promptsManager.internalShowSmsSlidedown({
      ...options,
    });
  }

  async promptEmail(options?: AutoPromptOptions): Promise<void> {
    if (isConsentRequiredButNotGiven()) return;
    await awaitOneSignalInitAndSupported();
    await OneSignal._context.promptsManager.internalShowEmailSlidedown({
      ...options,
    });
  }

  async promptSmsAndEmail(options?: AutoPromptOptions): Promise<void> {
    if (isConsentRequiredButNotGiven()) return;
    await awaitOneSignalInitAndSupported();
    await OneSignal._context.promptsManager.internalShowSmsAndEmailSlidedown({
      ...options,
    });
  }

  addEventListener(
    event: 'slidedownShown',
    listener: (wasShown: boolean) => void,
  ): void {
    OneSignal._emitter.on(event, listener);
  }

  removeEventListener(
    event: 'slidedownShown',
    listener: (wasShown: boolean) => void,
  ): void {
    OneSignal._emitter.off(event, listener);
  }
}
