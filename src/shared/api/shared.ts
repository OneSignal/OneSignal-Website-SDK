import type { OutcomeRequestData } from '../outcomes/types';
import * as OneSignalApiBase from './base';
import { error, info } from 'src/shared/libraries/log';

export async function sendOutcome(data: OutcomeRequestData): Promise<void> {
  info('Outcome payload:', data);
  try {
    await OneSignalApiBase.post('outcomes/measure', data);
  } catch (e) {
    error('sendOutcome', e);
  }
}
