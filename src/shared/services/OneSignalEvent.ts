import Environment from '../helpers/Environment';
import SdkEnvironment from '../managers/SdkEnvironment';
import { WindowEnvironmentKind } from '../models/WindowEnvironmentKind';
import Utils from '../context/Utils';
import Log from '../libraries/Log';

const SILENT_EVENTS = [
  'notifyButtonHovering',
  'notifyButtonHover',

  'notifyButtonButtonClick',
  'notifyButtonLauncherClick',
  'animatedElementHiding',
  'animatedElementHidden',
  'animatedElementShowing',
  'animatedElementShown',
  'activeAnimatedElementActivating',
  'activeAnimatedElementActive',
  'activeAnimatedElementInactivating',
  'activeAnimatedElementInactive',
  'dbRetrieved',
  'dbSet',
  'testEvent',
];

const RETRIGGER_REMOTE_EVENTS = [
  'onesignal.prompt.custom.clicked',
  'onesignal.prompt.native.permissionchanged',
  'onesignal.subscription.changed',
  'onesignal.internal.subscriptionset',
  'dbRebuilt',
  'initialize',
  'subscriptionSet',
  'sendWelcomeNotification',
  'subscriptionChange',
  'permissionChange', // notification
  'dbSet',
  'register',
  'willDisplay', // notification
  'dismiss', // notification
  'click', // notification
  'permissionPromptDisplay',
  'testWouldDisplay',
  'testInitOptionDisabled',
  'popupWindowTimeout',
];

const LEGACY_EVENT_MAP: { [key: string]: string } = {
  permissionChange: 'onesignal.prompt.native.permissionchanged',
  subscriptionChange: 'onesignal.subscription.changed',
  customPromptClick: 'onesignal.prompt.custom.clicked',
};

export default class OneSignalEvent {
  /**
   * Triggers the specified event with optional custom data.
   * @param eventName The string event name to be emitted.
   * @param data Any JavaScript variable to be passed with the event.
   * @param remoteTriggerEnv If this method is being called in a different environment (e.g. was triggered
   *  in iFrame but now retriggered on main host), this is the string of the original environment for logging purposes.
   */
  static async trigger(
    eventName: string,
    data?: any,
    remoteTriggerEnv: string | null = null,
  ) {
    if (!Utils.contains(SILENT_EVENTS, eventName)) {
      const displayData = data;
      let env = Utils.capitalize(SdkEnvironment.getWindowEnv().toString());
      if (remoteTriggerEnv) {
        env = `${env} ⬸ ${Utils.capitalize(remoteTriggerEnv)}`;
      }

      if (displayData || displayData === false) {
        Log.debug(`(${env}) » ${eventName}:`, displayData);
      } else {
        Log.debug(`(${env}) » ${eventName}`);
      }
    }

    // Actually fire the event that can be listened to via OneSignal.on()
    if (Environment.isBrowser()) {
      if (eventName === OneSignal.EVENTS.SDK_INITIALIZED) {
        if (OneSignal.initialized) return;
        else OneSignal.initialized = true;
      }
      await OneSignal.emitter.emit(eventName, data);
    }
    // eslint-disable-next-line no-prototype-builtins
    if (LEGACY_EVENT_MAP.hasOwnProperty(eventName)) {
      const legacyEventName = LEGACY_EVENT_MAP[eventName];
      OneSignalEvent._triggerLegacy(legacyEventName, data);
    }

    // If this event was triggered in an iFrame or Popup environment, also trigger it on the host page
    if (
      Environment.isBrowser() &&
      (SdkEnvironment.getWindowEnv() ===
        WindowEnvironmentKind.OneSignalSubscriptionPopup ||
        SdkEnvironment.getWindowEnv() ===
          WindowEnvironmentKind.OneSignalProxyFrame)
    ) {
      const creator = opener || parent;
      if (!creator) {
        Log.error(
          `Could not send event '${eventName}' back to host page because no creator (opener or parent) found!`,
        );
      } else {
        // But only if the event matches certain events
        if (Utils.contains(RETRIGGER_REMOTE_EVENTS, eventName)) {
          if (
            SdkEnvironment.getWindowEnv() ===
            WindowEnvironmentKind.OneSignalSubscriptionPopup
          ) {
            OneSignal.subscriptionPopup.message(
              OneSignal.POSTMAM_COMMANDS.REMOTE_RETRIGGER_EVENT,
              { eventName: eventName, eventData: data },
            );
          } else {
            OneSignal.proxyFrame.retriggerRemoteEvent(eventName, data);
          }
        }
      }
    }
  }

  /**
   * Fires the event to be listened to via window.addEventListener().
   * @param eventName The string event name.
   * @param data Any JavaScript variable to be passed with the event.
   * @private
   */
  static _triggerLegacy(eventName: string, data: any) {
    const event = new CustomEvent(eventName, {
      bubbles: true,
      cancelable: true,
      detail: data,
    });
    // Fire the event that listeners can listen to via 'window.addEventListener()'
    window.dispatchEvent(event);
  }
}
