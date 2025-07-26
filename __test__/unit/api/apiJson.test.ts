import OneSignal from '../../../src/onesignal/OneSignal';
import { matchApiToSpec } from '../../support/helpers/api';
import type { OneSignalWithIndex } from './OneSignalWithIndex';

describe('API matches spec file', () => {
  let OneSignalWithIndex: OneSignalWithIndex;

  beforeAll(() => {
    OneSignalWithIndex = OneSignal as OneSignalWithIndex;
  });

  test('Check top-level OneSignal API', async () => {
    await matchApiToSpec({ OneSignal: OneSignalWithIndex }, 'OneSignal');
  });

  test('Check Slidedown namespace', async () => {
    await matchApiToSpec(OneSignalWithIndex, 'Slidedown');
  });

  test('Check Notifications namespace', async () => {
    await matchApiToSpec(OneSignalWithIndex, 'Notifications');
  });

  test('Check Session namespace', async () => {
    await matchApiToSpec(OneSignalWithIndex, 'Session');
  });

  test('Check User namespace', async () => {
    await matchApiToSpec(OneSignalWithIndex, 'User');
  });

  test('Check PushSubscription namespace', async () => {
    await matchApiToSpec(OneSignalWithIndex['User'], 'PushSubscription');
  });
});
