import Environment from '../helpers/Environment';
import SdkEnvironment from '../managers/SdkEnvironment';
import Utils from '../context/Utils';
import Log from '../libraries/Log';

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
   */
  static async trigger(eventName: string, data?: any) {
    if (!Utils.contains(SILENT_EVENTS, eventName)) {
      const displayData = data;
      let env = Utils.capitalize(SdkEnvironment.getWindowEnv().toString());

      if (displayData || displayData === false) {
        Log.debug(`(${env}) » ${eventName}:`, displayData);
      } else {
        Log.debug(`(${env}) » ${eventName}`);
      }
    }

    // Fire internal event to those listening via OneSignal.emitter.on()
    if (Environment.isBrowser()) {
      if (eventName === OneSignal.EVENTS.SDK_INITIALIZED) {
        if (OneSignal.initialized) return;
        else OneSignal.initialized = true;
      }
      await OneSignal.emitter.emit(eventName, data);
    }
  }
}
