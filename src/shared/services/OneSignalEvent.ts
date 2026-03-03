import { windowEnvString } from '../environment/detect';
import Emitter from '../libraries/Emitter';
import Log from '../libraries/Log';
import { IS_SERVICE_WORKER } from '../utils/env';

export default class OneSignalEvent {
  /**
   * Triggers an internal event with optional custom data.
   * @param eventName The string event name to be emitted.
   * @param data Any JavaScript variable to be passed with the event.
   * @param emitter Emitter to emit the event from.
   */
  static async _trigger(eventName: string, data?: any, emitter?: Emitter) {
    if (data || data === false) {
      Log._debug(`(${windowEnvString}) » ${eventName}:`, data);
    } else {
      Log._debug(`(${windowEnvString}) » ${eventName}`);
    }

    // Fire internal event to those listening via OneSignal.emitter.on()
    if (!IS_SERVICE_WORKER) {
      if (eventName === OneSignal.EVENTS.SDK_INITIALIZED) {
        if (OneSignal._initialized) return;
        else OneSignal._initialized = true;
      }
      if (emitter) {
        await emitter._emit(eventName, data);
      } else {
        await OneSignal._emitter._emit(eventName, data);
      }
    }
  }
}
