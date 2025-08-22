import { addScriptToPage, getPathAndPrefix } from 'src/shared/helpers/script';
import { LOGGING, VERSION } from 'src/shared/utils/EnvVariables';
import LogBase from '../shared/helpers/log/LogBase';

export default class DebugNamespace {
  /**
   * @PublicApi
   * @param logLevel - string
   */
  async setLogLevel(logLevel: string) {
    LogBase.setLevel(logLevel);
    setupLogging();
  }
}

const setupLogging = async () => {
  if (import.meta.env.PROD) {
    addScriptToPage(`${getPathAndPrefix()}OneSignalSDK.logger.js?v=${VERSION}`);

    // cant use chunking for iife build
  } else {
    await import('../entries/logger');
  }
};

if (LOGGING) {
  setupLogging();
}
