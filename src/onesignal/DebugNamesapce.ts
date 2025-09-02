import Log from '../shared/libraries/Log';

export default class DebugNamespace {
  /**
   * @PublicApi
   * @param logLevel - string
   */
  setLogLevel(logLevel: string) {
    Log._setLevel(logLevel);
  }
}
