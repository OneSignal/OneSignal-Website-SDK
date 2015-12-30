import log from 'loglevel';
import Environment from './environment.js';
import { getConsoleStyle } from './utils.js';
import './string.js';


const SILENT_EVENTS = [
  'onesignal.bell.hovering',
  'onesignal.bell.hovered',
  'onesignal.bell.launcher.button.click',
  'onesignal.bell.launcher.click',
  'onesignal.bell.animatedelement.hiding',
  'onesignal.bell.animatedelement.hidden',
  'onesignal.bell.animatedelement.showing',
  'onesignal.bell.animatedelement.shown',
  'onesignal.bell.activeanimatedelement.activating',
  'onesignal.bell.activeanimatedelement.active',
  'onesignal.bell.activeanimatedelement.inactivating',
  'onesignal.bell.activeanimatedelement.inactive',
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
  static trigger(eventName, data, remoteTriggerEnv=null) {
    if (!eventName) {
      log.warn('Missing event name.');
    }
    if (SILENT_EVENTS.indexOf(eventName) === -1) {
      if (!Environment.isBrowser()) {
        log.debug(`(${Environment.getEnv().capitalize()}) » %c${eventName}:`, getConsoleStyle('event'), data, '(not triggered in a ServiceWorker environment)');
        return;
      } else {
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
    }
    if (Environment.isBrowser()) {
      var event = new CustomEvent(eventName, {
        bubbles: true, cancelable: true, detail: data
      });
      window.dispatchEvent(event);

      // If this event was triggered in an iFrame or Popup environment, also trigger it on the host page
      if (!Environment.isHost()) {
        var creator = opener || parent;
        if (!creator) {
          log.error(`Could not send event '${eventName}' back to host page because no creator (opener or parent) found!`);
        } else {
          // But only if the event matches certain events
          if (RETRIGGER_REMOTE_EVENTS.indexOf(eventName) !== -1) {
            OneSignal._safePostMessage(creator, {remoteEvent: eventName, remoteEventData: data, from: Environment.getEnv()}, OneSignal._initOptions.origin, null);
          }
        }
      }
    }
  }
}