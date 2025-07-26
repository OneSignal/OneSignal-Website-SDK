import Utils from '../context/Utils';
import { windowEnvString } from '../helpers/environment';
import Emitter from '../libraries/Emitter';
import Log from '../libraries/Log';
import { IS_SERVICE_WORKER } from '../utils/EnvVariables';

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
];

export default class OneSignalEvent {
  /**
   * Triggers an internal event with optional custom data.
   * @param eventName The string event name to be emitted.
   * @param data Any JavaScript variable to be passed with the event.
   * @param emitter Emitter to emit the event from.
   */
  static async trigger(eventName: string, data?: any, emitter?: Emitter) {
    if (!Utils.contains(SILENT_EVENTS, eventName)) {
      const displayData = data;

      if (displayData || displayData === false) {
        Log.debug(`(${windowEnvString}) » ${eventName}:`, displayData);
      } else {
        Log.debug(`(${windowEnvString}) » ${eventName}`);
      }
    }

    // Fire internal event to those listening via OneSignal.emitter.on()
    if (!IS_SERVICE_WORKER) {
      if (eventName === OneSignal.EVENTS.SDK_INITIALIZED) {
        if (OneSignal.initialized) return;
        else OneSignal.initialized = true;
      }
      if (emitter) {
        await emitter.emit(eventName, data);
      } else {
        await OneSignal.emitter.emit(eventName, data);
      }
    }
  }
}
