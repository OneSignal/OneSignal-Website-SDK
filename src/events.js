import log from 'loglevel';
import Environment from './environment.js';
import { getConsoleStyle, contains } from './utils.js';
import './string.js';


const SILENT_EVENTS = [
  'onesignal.nb.hovering',
  'onesignal.nb.hovered',
  'onesignal.nb.launcher.button.click',
  'onesignal.nb.launcher.click',
  'onesignal.nb.animatedelement.hiding',
  'onesignal.nb.animatedelement.hidden',
  'onesignal.nb.animatedelement.showing',
  'onesignal.nb.animatedelement.shown',
  'onesignal.nb.activeanimatedelement.activating',
  'onesignal.nb.activeanimatedelement.active',
  'onesignal.nb.activeanimatedelement.inactivating',
  'onesignal.nb.activeanimatedelement.inactive',
  'onesignal.db.retrieved',
  'onesignal.db.set'
  ];

const RETRIGGER_REMOTE_EVENTS = [
  'onesignal.prompt.custom.clicked',
  'onesignal.prompt.native.permissionchanged',
  'onesignal.subscription.changed',
  'onesignal.internal.subscriptionset'
];

const LEGACY_EVENT_MAP = {
  'subscriptionChanged': 'onesignal.subscription.changed',
  'customPromptClicked': 'onesignal.prompt.custom.clicked',
}

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
        log.debug(`(${env}) » %c${legacyEventName}:`, getConsoleStyle('event'), displayData);
      } else {
        log.debug(`(${env}) » %c${legacyEventName}`, getConsoleStyle('event'));
      }
    }

    // Actually fire the event that can be listened to via OneSignal.on()
    OneSignal.emit(newEventName, data);

    // If this event was triggered in an iFrame or Popup environment, also trigger it on the host page
    if (!Environment.isHost()) {
      var creator = opener || parent;
      if (!creator) {
        log.error(`Could not send event '${legacyEventName}' back to host page because no creator (opener or parent) found!`);
      } else {
        // But only if the event matches certain events
        if (contains(RETRIGGER_REMOTE_EVENTS, legacyEventName)) {
          OneSignal._safePostMessage(creator, {remoteEvent: legacyEventName, remoteEventData: data, from: Environment.getEnv()}, OneSignal._initOptions.origin, null);
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