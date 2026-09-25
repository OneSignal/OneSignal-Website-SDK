import Log from '../libraries/Log';
import type { OutcomeRequestData } from '../outcomes/types';
import * as OneSignalApiBase from './base';

/**
 * Never signed, also under Identity Verification. The server does no auth check
 * on this route, and the Android SDK sends it without a bearer. Do not add a
 * token here.
 */
export async function sendOutcome(data: OutcomeRequestData): Promise<void> {
  Log._info('Outcome payload:', data);
  try {
    await OneSignalApiBase.post('outcomes/measure', data);
  } catch (e) {
    Log._error('sendOutcome', e);
  }
}
