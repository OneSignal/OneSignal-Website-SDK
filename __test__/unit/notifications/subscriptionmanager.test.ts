import { SubscriptionManagerPage } from '../../../src/shared/managers/subscription/page';
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
      ).toBe('default');
    });

    test('denied', async () => {
      MockNotification.permission = 'denied';
      expect(
        await SubscriptionManagerPage.requestNotificationPermission(),
      ).toBe('denied');
    });

    test('granted', async () => {
      MockNotification.permission = 'granted';
      expect(
        await SubscriptionManagerPage.requestNotificationPermission(),
      ).toBe('granted');
    });
  });
});
