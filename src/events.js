import log from 'loglevel';
import Environment from './environment.js';
import Bell from './bell.js';
import { getConsoleStyle } from './utils.js';

const SILENT_EVENTS = [
  Bell.EVENTS.HOVERING,
  Bell.EVENTS.HOVERED,
  Bell.EVENTS.BUTTON_CLICK,
  Bell.EVENTS.CLICK,
  OneSignal.EVENTS.DB_VALUE_RETRIEVED,
  OneSignal.EVENTS.DB_VALUE_SET
];

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
        if (displayData) {
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