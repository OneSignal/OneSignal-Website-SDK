import OneSignal from '../../../src/onesignal/OneSignal';
import { matchApiToSpec } from '../../support/helpers/api';

describe('API matches spec file', () => {
  test('Check top-level OneSignal API', async () => {
    await matchApiToSpec({ OneSignal }, 'OneSignal');
  });

  test('Check Slidedown namespace', async () => {
    await matchApiToSpec(OneSignal, 'Slidedown');
  });

  test('Check Notifications namespace', async () => {
    await matchApiToSpec(OneSignal, 'Notifications');
  });

  test('Check Session namespace', async () => {
    await matchApiToSpec(OneSignal, 'Session');
  });

  test('Check User namespace', async () => {
    await matchApiToSpec(OneSignal, 'User');
  });

  test('Check PushSubscription namespace', async () => {
    await matchApiToSpec(OneSignal['User'], 'PushSubscription');
  });
});
