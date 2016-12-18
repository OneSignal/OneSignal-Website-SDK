import * as log from "loglevel";
import * as Cookie from "js-cookie";


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
   * Creates a session cookie to note that the user does not want to be disturbed for the rest of the browser session.
   */
  static markHttpsNativePromptDismissed() {
    log.debug('OneSignal: User dismissed the native notification prompt; storing flag.');
    return Cookie.set('onesignal-notification-prompt', 'dismissed', {
      // In 8 hours, or 1/3 of the day
      expires: 0.333
    });
  }
}