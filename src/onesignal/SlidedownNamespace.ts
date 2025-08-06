import type { AutoPromptOptions } from '../page/managers/PromptsManager';
import { EventListenerBase } from '../page/userModel/EventListenerBase';
import { DelayedPromptType } from '../shared/prompts/constants';
import { awaitOneSignalInitAndSupported } from '../shared/utils/utils';
import OneSignal from './OneSignal';

export default class SlidedownNamespace extends EventListenerBase {
  constructor() {
    super();
  }

  /**
   * Shows a sliding modal prompt on the page for users.
   * @PublicApi
   */
  async promptPush(options?: AutoPromptOptions): Promise<void> {
    await awaitOneSignalInitAndSupported();
    await OneSignal.context.promptsManager.internalShowParticularSlidedown(
      DelayedPromptType.Push,
      options,
    );
  }

  async promptPushCategories(options?: AutoPromptOptions): Promise<void> {
    await awaitOneSignalInitAndSupported();
    const isPushEnabled =
      await OneSignal.context.subscriptionManager.isPushNotificationsEnabled();
    await OneSignal.context.promptsManager.internalShowCategorySlidedown({
      ...options,
      isInUpdateMode: isPushEnabled,
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

  addEventListener(
    event: 'slidedownShown',
    listener: (wasShown: boolean) => void,
  ): void {
    OneSignal.emitter.on(event, listener);
  }

  removeEventListener(
    event: 'slidedownShown',
    listener: (wasShown: boolean) => void,
  ): void {
    OneSignal.emitter.off(event, listener);
  }
}
