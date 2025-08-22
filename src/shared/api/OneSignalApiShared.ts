import log from '../helpers/log';
import { MessageType } from '../helpers/log/constants';
import type { OutcomeRequestData } from '../outcomes/types';
import OneSignalApiBase from './OneSignalApiBase';

export default class OneSignalApiShared {
  static async sendOutcome(data: OutcomeRequestData): Promise<void> {
    log(MessageType.ApiOutcomePayload, {
      payload: data,
    });
    try {
      await OneSignalApiBase.post('outcomes/measure', data);
    } catch (e) {
      log(MessageType.ApiOutcomeError, { error: e });
    }
  }
}
