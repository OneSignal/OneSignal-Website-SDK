import { setLevel } from 'src/shared/libraries/log';

export default class DebugNamespace {
  /**
   * @PublicApi
   * @param logLevel - string
   */
  setLogLevel(logLevel: string) {
    setLevel(logLevel);
  }
}
