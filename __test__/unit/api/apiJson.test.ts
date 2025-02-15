import OneSignal from '../../../src/onesignal/OneSignal';
import { OneSignalWithIndex } from './OneSignalWithIndex';
import { IdentityExecutor } from '../../../src/core/executors/IdentityExecutor';
import { PropertiesExecutor } from '../../../src/core/executors/PropertiesExecutor';
import { SubscriptionExecutor } from '../../../src/core/executors/SubscriptionExecutor';
import { matchApiToSpec } from '../../support/helpers/api';

vi.spyOn(
  PropertiesExecutor.prototype,
  'getOperationsFromCache',
).mockResolvedValue([]);
vi.spyOn(
  IdentityExecutor.prototype,
  'getOperationsFromCache',
).mockResolvedValue([]);
vi.spyOn(
  SubscriptionExecutor.prototype,
  'getOperationsFromCache',
).mockResolvedValue([]);

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
