import log from 'loglevel';
import Environment from './environment.js';
import { getConsoleStyle, contains } from './utils.js';
import './string.js';


const SILENT_EVENTS = [
  'notifyButtonHovering',
  'notifyButtonHover',
  'notifyButtonButtonClick',
  'notifyButtonLauncherClick',
  'animatedElementHiding',
  'aniamtedElementHidden',
  'animatedElementShowing',
  'animatedElementShown',
  'activeAnimatedElementActivating',
  'activeAnimatedElementActive',
  'activeAnimatedElementInactivating',
  'activeAnimatedElementInactive',
  'dbRetrieved',
  'dbSet'
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
  'notificationPermissionChange',
  'dbSet',
  'register',
  'notificationDisplay',
  'notificationDismiss',
  'permissionPromptDisplay'
];

const LEGACY_EVENT_MAP = {
  'notificationPermissionChange': 'onesignal.prompt.native.permissionchanged',
  'subscriptionChange': 'onesignal.subscription.changed',
  'customPromptClick': 'onesignal.prompt.custom.clicked',
};

export default class Event {

  /**
   * Triggers the specified event with optional custom data.
   * @param eventName The string event name to be emitted.
   * @param data Any JavaScript variable to be passed with the event.
   * @param remoteTriggerEnv If this method is being called in a different environment (e.g. was triggered in iFrame but now retriggered on main host), this is the string of the original environment for logging purposes.
   */
  static trigger(eventName, data, remoteTriggerEnv=null) {
    if (!contains(SILENT_EVENTS, eventName)) {
      let displayData = data;
      if (remoteTriggerEnv) {
        var env = `${Environment.getEnv().capitalize()} ⬸ ${remoteTriggerEnv.capitalize()}`;
      } else {
        var env = Environment.getEnv().capitalize();
      }

      if (displayData || displayData === false) {
        log.debug(`(${env}) » %c${eventName}:`, getConsoleStyle('event'), displayData);
      } else {
        log.debug(`(${env}) » %c${eventName}`, getConsoleStyle('event'));
      }
    }

    // Actually fire the event that can be listened to via OneSignal.on()
    if (Environment.isBrowser()) {
      if (eventName === OneSignal.EVENTS.SDK_INITIALIZED) {
        if (OneSignal.initialized)
          return;
        else
          OneSignal.initialized = true;
      }
      OneSignal.emit(eventName, data);
    }
    if (LEGACY_EVENT_MAP.hasOwnProperty(eventName)) {
      let legacyEventName = LEGACY_EVENT_MAP[eventName];
      Event._triggerLegacy(legacyEventName, data);
    }

    // If this event was triggered in an iFrame or Popup environment, also trigger it on the host page
    if (Environment.isBrowser() &&
        (Environment.isPopup() || Environment.isIframe())) {
      var creator = opener || parent;
      if (!creator) {
        log.error(`Could not send event '${eventName}' back to host page because no creator (opener or parent) found!`);
      } else {
        // But only if the event matches certain events
        if (contains(RETRIGGER_REMOTE_EVENTS, eventName)) {
          if (Environment.isPopup()) {
            OneSignal.popupPostmam.postMessage(OneSignal.POSTMAM_COMMANDS.REMOTE_RETRIGGER_EVENT, {eventName: eventName, eventData: data});
          } else {
            OneSignal.iframePostmam.message(OneSignal.POSTMAM_COMMANDS.REMOTE_RETRIGGER_EVENT, {eventName: eventName, eventData: data});
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
  static _triggerLegacy(eventName, data) {
    var event = new CustomEvent(eventName, {
      bubbles: true, cancelable: true, detail: data
    });
    // Fire the event that listeners can listen to via 'window.addEventListener()'
    window.dispatchEvent(event);
  }
}