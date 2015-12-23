import log from 'loglevel';
import Environment from './environment.js';
import { getConsoleStyle } from './utils.js';


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

export default class Event {
  static trigger(eventName, data) {
    if (!eventName) {
      log.trace('Missing event name.');
    }
    if (SILENT_EVENTS.indexOf(eventName) == -1) {
      if (!Environment.isBrowser()) {
        log.debug(`%c${eventName}:`, getConsoleStyle('event'), data, '(not triggered in a ServiceWorker environment)');
        return;
      } else {
        let displayData = data;
        if (displayData || displayData === false) {
          log.debug(`» %c${eventName}:`, getConsoleStyle('event'), displayData);
        } else {
          log.debug(`» %c${eventName}`, getConsoleStyle('event'));
        }
      }
    }
    if (Environment.isBrowser()) {
      var event = new CustomEvent(eventName, {
        bubbles: true, cancelable: true, detail: data
      });
      window.dispatchEvent(event);
    }
  }
}