import { debug } from 'src/shared/libraries/log';
import { containsMatch } from '../context/helpers';
import { windowEnvString } from '../environment/detect';
import { IS_SERVICE_WORKER } from '../utils/env';
import type { EventsMap } from './types';

const SILENT_EVENTS = [
  'notifyButtonHovering',
  'notifyButtonHover',
  'notifyButtonButtonClick',
  'notifyButtonLauncherClick',
];

export default class OneSignalEvent {
  /**
   * Triggers an internal event with optional custom data.
   * @param eventName The string event name to be emitted.
   * @param data Any JavaScript variable to be passed with the event.
   */
  static async _trigger<T extends keyof EventsMap>(
    eventName: T,
    data?: EventsMap[T],
  ) {
    if (!containsMatch(SILENT_EVENTS, eventName)) {
      const displayData = data;

      if (displayData || displayData === false) {
        debug(`(${windowEnvString}) » ${eventName}:`, displayData);
      } else {
        debug(`(${windowEnvString}) » ${eventName}`);
      }
    }

    // Fire internal event to those listening via OneSignal.emitter.on()
    if (!IS_SERVICE_WORKER) {
      if (eventName === 'initializeInternal') {
        if (OneSignal._initialized) return;
        else OneSignal._initialized = true;
      }

      await OneSignal._emitter._emit(eventName, data);
    }
  }
}
