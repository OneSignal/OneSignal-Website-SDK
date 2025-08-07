import {
  DismissCountKey,
  DismissPrompt,
  type DismissPromptValue,
  DismissTimeKey,
} from '../../page/models/Dismiss';
import TimedLocalStorage from '../../page/modules/TimedLocalStorage';
import { windowEnvString } from '../environment/detect';
import Log from '../libraries/Log';
import Database from '../services/Database';

const DISMISS_TYPE_COUNT_MAP = {
  [DismissPrompt.Push]: DismissCountKey.PromptDismissCount,
  [DismissPrompt.NonPush]: DismissCountKey.NonPushPromptsDismissCount,
};

const DISMISS_TYPE_TIME_MAP = {
  [DismissPrompt.Push]: DismissTimeKey.OneSignalNotificationPrompt,
  [DismissPrompt.NonPush]: DismissTimeKey.OneSignalNonPushPrompt,
};

export class DismissHelper {
  /**
   * Creates an expiring local storage entry to note that the user does not want to be disturbed.
   */
  static async markPromptDismissedWithType(type: DismissPromptValue) {
    const countKey = DISMISS_TYPE_COUNT_MAP[type];
    const timeKey = DISMISS_TYPE_TIME_MAP[type];

    let dismissCount = await Database.get<number>('Options', countKey);
    if (!dismissCount) {
      dismissCount = 0;
    }
    dismissCount += 1;

    let dismissDays = 3;
    if (dismissCount == 2) {
      dismissDays = 7;
    } else if (dismissCount > 2) {
      dismissDays = 30;
    }
    Log.debug(
      `(${windowEnvString} environment) OneSignal: User dismissed the ${type} ` +
        `notification prompt; reprompt after ${dismissDays} days.`,
    );
    await Database.put('Options', { key: countKey, value: dismissCount });

    const dismissMinutes = dismissDays * 24 * 60;
    return TimedLocalStorage.setItem(timeKey, 'dismissed', dismissMinutes);
  }

  /**
   * Returns true if a LocalStorage entry exists for noting the user dismissed the prompt.
   */
  static wasPromptOfTypeDismissed(type: DismissPromptValue): boolean {
    switch (type) {
      case DismissPrompt.Push:
        return (
          TimedLocalStorage.getItem(
            DismissTimeKey.OneSignalNotificationPrompt,
          ) === 'dismissed'
        );
      case DismissPrompt.NonPush:
        return (
          TimedLocalStorage.getItem(DismissTimeKey.OneSignalNonPushPrompt) ===
          'dismissed'
        );
      default:
        break;
    }
    return false;
  }
}
