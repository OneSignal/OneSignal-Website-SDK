import type { OutcomeRequestData } from '../../page/models/OutcomeRequestData';
import Log from '../libraries/Log';
import OneSignalApiBase from './OneSignalApiBase';

export default class OneSignalApiShared {
  static async sendOutcome(data: OutcomeRequestData): Promise<void> {
    Log.info('Outcome payload:', data);
    try {
      await OneSignalApiBase.post('outcomes/measure', data);
    } catch (e) {
      Log.error('sendOutcome', e);
    }
  }
}
