import log from 'loglevel';
import Environment from './environment.js';
import { getConsoleStyle } from './utils.js';


const SILENT_EVENTS = [
  'onesignal.bell.hovering',
  'onesignal.bell.hovered',
  'onesignal.bell.button.click',
  'onesignal.bell.click',
  'onesignal.db.valueretrieved',
  'onesignal.db.valueset'];

export default class Event {
  static trigger(eventName, data) {
    if (SILENT_EVENTS.indexOf(eventName) == -1) {
      if (!Environment.isBrowser()) {
        log.debug(`%c${eventName}:`, getConsoleStyle('event'), data, '(not triggered in a ServiceWorker environment)');
        return;
      } else {
        let displayData = data;
        if (typeof IDBCursorWithValue !== "undefined" && displayData instanceof IDBCursorWithValue) {
          displayData = data.value;
        }
        if (displayData || displayData === false) {
          log.debug(`%c${eventName}:`, getConsoleStyle('event'), displayData);
        } else {
          log.debug(`%c${eventName}`, getConsoleStyle('event'));
        }
      }
    }
    if (Environment.isBrowser()) {
      var event = new CustomEvent(eventName, {
        bubbles: true, cancelable: true, details: data
      });
      window.dispatchEvent(event);
    }
  }
}