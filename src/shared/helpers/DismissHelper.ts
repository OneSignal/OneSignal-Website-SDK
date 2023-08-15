

import { DismissPrompt, DismissCountKey, DismissTimeKey } from '../../page/models/Dismiss';
import TimedLocalStorage from '../../page/modules/TimedLocalStorage';
import Log from '../libraries/Log';
import SdkEnvironment from '../managers/SdkEnvironment';
import Database from '../services/Database';
import { isUsingSubscriptionWorkaround } from '../utils/utils';

declare var OneSignal: any;

const DISMISS_TYPE_COUNT_MAP = {
  [DismissPrompt.Push]: DismissCountKey.PromptDismissCount,
  [DismissPrompt.NonPush]: DismissCountKey.NonPushPromptsDismissCount
};

const DISMISS_TYPE_TIME_MAP = {
  [DismissPrompt.Push] : DismissTimeKey.OneSignalNotificationPrompt,
  [DismissPrompt.NonPush] : DismissTimeKey.OneSignalNonPushPrompt
};

export class DismissHelper {
  /**
   * Creates an expiring local storage entry to note that the user does not want to be disturbed.
   */
  static async markPromptDismissedWithType(type: DismissPrompt) {
    /**
     * Note: LocalStorage is set both on subdomain.onesignal.com and the main site.
     *
     * When checking whether the prompt was previously dismissed, certain code cannot be
     * asynchronous otherwise the browser treats it like a blocked popup, so LocalStorage is
     * synchronous while IndexedDb access / PostMessage querying across origins are both
     * asynchronous.
     */
    if (isUsingSubscriptionWorkaround()) {
      try {
        await new Promise<void>((resolve, reject) => {
          OneSignal.proxyFrameHost.message(OneSignal.POSTMAM_COMMANDS.MARK_PROMPT_DISMISSED, {}, reply => {
            if (reply.data === OneSignal.POSTMAM_COMMANDS.REMOTE_OPERATION_COMPLETE) {
              resolve();
            } else {
              reject();
            }
          });
        });
      } catch(e) {
        Log.debug("Proxy Frame possibly didn't not receive MARK_PROMPT_DISMISSED message", e || "");
      }
    }

    const countKey = DISMISS_TYPE_COUNT_MAP[type];
    const timeKey  = DISMISS_TYPE_TIME_MAP[type];

    let dismissCount = await Database.get<number>('Options', countKey);
    if (!dismissCount) {
      dismissCount = 0;
    }
    /**
     * This will be run twice for HTTP sites, since we share IndexedDb, so we don't run it for HTTP sites.
     */
    if (!isUsingSubscriptionWorkaround()) {
      dismissCount += 1;
    }

    let dismissDays = 3;
    if (dismissCount == 2) {
      dismissDays = 7;
    } else if (dismissCount > 2) {
      dismissDays = 30;
    }
    Log.debug(`(${SdkEnvironment.getWindowEnv().toString()}) OneSignal: User dismissed the ${type} ` +
      `notification prompt; reprompt after ${dismissDays} days.`);
    await Database.put('Options', { key: countKey, value: dismissCount });

    const dismissMinutes = dismissDays * 24 * 60;
    return TimedLocalStorage.setItem(timeKey, 'dismissed', dismissMinutes);
  }

  /**
   * Returns true if a LocalStorage entry exists for noting the user dismissed the prompt.
   */
  static wasPromptOfTypeDismissed(type: DismissPrompt): boolean {
    switch (type) {
      case DismissPrompt.Push:
        return TimedLocalStorage.getItem(DismissTimeKey.OneSignalNotificationPrompt) === 'dismissed';
      case DismissPrompt.NonPush:
        return TimedLocalStorage.getItem(DismissTimeKey.OneSignalNonPushPrompt) === 'dismissed';
      default:
        break;
    }
    return false;
  }
}
