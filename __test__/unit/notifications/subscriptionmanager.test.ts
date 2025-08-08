import { SubscriptionManagerPage } from '../../../src/shared/managers/subscription/page';
import { NotificationPermission } from '../../../src/shared/models/NotificationPermission';
import MockNotification from '../../support/mocks/MockNotification';

describe('SubscriptionManagerPage', () => {
  describe('requestNotificationPermission', () => {
    beforeEach(() => {
      window.Notification = MockNotification;
    });

    test('default', async () => {
      MockNotification.permission = 'default';
      expect(
        await SubscriptionManagerPage.requestNotificationPermission(),
      ).toBe(NotificationPermission.Default);
    });

    test('denied', async () => {
      MockNotification.permission = 'denied';
      expect(
        await SubscriptionManagerPage.requestNotificationPermission(),
      ).toBe(NotificationPermission.Denied);
    });

    test('granted', async () => {
      MockNotification.permission = 'granted';
      expect(
        await SubscriptionManagerPage.requestNotificationPermission(),
      ).toBe(NotificationPermission.Granted);
    });
  });
});
