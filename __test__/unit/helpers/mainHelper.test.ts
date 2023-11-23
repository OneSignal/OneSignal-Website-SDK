import MainHelper from '../../../src/shared/helpers/MainHelper';
import { SubscriptionStateKind } from '../../../src/shared/models/SubscriptionStateKind';
import { TestEnvironment } from '../../support/environment/TestEnvironment';
import { NotificationPermission } from '../../../src/shared/models/NotificationPermission';

describe('MainHelper Tests', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    await TestEnvironment.initialize();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('getCurrentNotificationType for default permission', async () => {
    test.stub(
      OneSignal.context.permissionManager,
      'getNotificationPermission',
      NotificationPermission.Default,
    );
    const result = await MainHelper.getCurrentNotificationType();
    expect(result).toBe(SubscriptionStateKind.NoNativePermission);
  });
});
