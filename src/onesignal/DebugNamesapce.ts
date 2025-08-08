import { WorkerMessengerCommand } from 'src/shared/libraries/workerMessenger/constants';
import Log from '../shared/libraries/Log';

export default class DebugNamespace {
  /**
   * @PublicApi
   * @param logLevel - string
   */
  setLogLevel(logLevel: string) {
    Log.setLevel(logLevel);
    OneSignal.context.workerMessenger.directPostMessageToSW(
      WorkerMessengerCommand.SetLogging,
      { shouldLog: logLevel === 'trace' },
    );
  }
}
