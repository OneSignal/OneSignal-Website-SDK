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

export default class Event {
  static trigger(legacyEventName, data, remoteTriggerEnv=null) {
    let oldEventName = legacyEventName;
    legacyEventName = legacyEventName.legacyName;
    let eventObject = null;
    let eventObjectsKeys = Object.keys(OneSignal.EVENTS);
    for (let eventObjectsKey of eventObjectsKeys) {
      eventObject = OneSignal.EVENTS[eventObjectsKey];
      if (eventObject.legacyName == legacyEventName) {
        break;
      }
    }
    let newEventName = eventObject.name;
    if (!legacyEventName) {
      debugger;
      log.warn('Missing event name.');
    }
    if (!eventObject) {
      log.warn('Event not found.');
    }
    if (!contains(SILENT_EVENTS, legacyEventName)) {
      if (!Environment.isBrowser()) {
        log.debug(`(${Environment.getEnv().capitalize()}) » %c${legacyEventName}:`, getConsoleStyle('event'), data, '(not triggered in a ServiceWorker environment)');
        return;
      } else {
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
    }
    if (Environment.isBrowser()) {
      var event = new CustomEvent(legacyEventName, {
        bubbles: true, cancelable: true, detail: data
      });
      // Fire the event that listeners can listen to via 'window.addEventListener()'
      window.dispatchEvent(event);
      if (newEventName) {
        // Fire the event that listeners can listen to via
        OneSignal.emit(newEventName, data);
      }

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
  }
}