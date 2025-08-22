import log from '../helpers/log';
import { LogMessage } from '../helpers/log/constants';
import type { OutcomeRequestData } from '../outcomes/types';
import OneSignalApiBase from './OneSignalApiBase';

export default class OneSignalApiShared {
  static async sendOutcome(data: OutcomeRequestData): Promise<void> {
    log(LogMessage.ApiOutcomePayload, {
      payload: data,
    });
    try {
      await OneSignalApiBase.post('outcomes/measure', data);
    } catch (e) {
      log(LogMessage.ApiOutcomeError, { error: e });
    }
  }
}
