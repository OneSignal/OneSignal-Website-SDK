import * as Cookie from 'js-cookie';
import * as log from 'loglevel';

import SdkEnvironment from '../managers/SdkEnvironment';
import Database from '../services/Database';
import SubscriptionHelper from './SubscriptionHelper';

declare var OneSignal: any;

export default class TestHelper {
  /**
   * Just for debugging purposes, removes the coookie from hiding the native prompt.
   * @returns {*}
   */
  static unmarkHttpsNativePromptDismissed() {
    if (Cookie.remove('onesignal-notification-prompt')) {
      log.debug('OneSignal: Removed the native notification prompt dismissed cookie.')
    } else {
      log.debug('OneSignal: Cookie not marked.');
    }
  }

  /**
   * Creates a session cookie to note that the user does not want to be disturbed.
   */

  static async markHttpsNativePromptDismissed() {
    /**
     * Note: The cookie must be stored both on subdomain.onesignal.com and the main site.
     *
     * When checking whether the prompt was previously dismissed, certain code cannot be asynchronous otherwise the browser
     * treats it like a blocked popup, so Cookies are synchronous while IndexedDb access / PostMessage querying across origins are
     * both asynchronous.
     */
    if (SubscriptionHelper.isUsingSubscriptionWorkaround()) {
      await new Promise((resolve, reject) => {
        OneSignal.proxyFrameHost.message(OneSignal.POSTMAM_COMMANDS.MARK_PROMPT_DISMISSED, {}, reply => {
          if (reply.data === OneSignal.POSTMAM_COMMANDS.REMOTE_OPERATION_COMPLETE) {
            resolve();
          } else {
            reject();
          }
        });
      });
    }
    let dismissCount = await Database.get<number>('Options', 'promptDismissCount');
    if (!dismissCount) {
      dismissCount = 0;
    }
    /**
     * This will be run twice for HTTP sites, since we share IndexedDb, so we don't run it for HTTP sites.
     */
    if (!SubscriptionHelper.isUsingSubscriptionWorkaround()) {
      dismissCount += 1;
    }

    let dismissDays = 3;
    if (dismissCount == 2) {
      dismissDays = 7;
    } else if (dismissCount > 2) {
      dismissDays = 30;
    }
    log.debug(`(${SdkEnvironment.getWindowEnv().toString()}) OneSignal: User dismissed the native notification prompt; reprompt after ${dismissDays} days.`);
    await Database.put('Options', { key: 'promptDismissCount', value: dismissCount });
    return Cookie.set('onesignal-notification-prompt', 'dismissed', {
      // In 8 hours, or 1/3 of the day
      expires: dismissDays
    });
  }
}
