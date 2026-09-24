import Log from '../shared/libraries/Log';
import type { OneSignalDebug } from './OneSignalInterface';

export default class DebugNamespace implements OneSignalDebug {
  /**
   * @PublicApi
   * @param logLevel - string
   */
  setLogLevel(logLevel: string) {
    Log._setLevel(logLevel);
  }
}
