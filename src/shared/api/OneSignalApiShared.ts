import Log from '../libraries/Log';
import type { OutcomeRequestData } from '../outcomes/types';
import * as OneSignalApiBase from './base';

export default class OneSignalApiShared {
  static async sendOutcome(data: OutcomeRequestData): Promise<void> {
    Log._info('Outcome payload:', data);
    try {
      await OneSignalApiBase.post('outcomes/measure', data);
    } catch (e) {
      Log._error('sendOutcome', e);
    }
  }
}
