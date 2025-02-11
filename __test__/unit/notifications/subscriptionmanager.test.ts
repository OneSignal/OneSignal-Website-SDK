import { beforeEach, describe, expect, test } from "vitest";
import MockNotification from '../../support/mocks/MockNotification';
import { SubscriptionManager } from '../../../src/shared/managers/SubscriptionManager';
import { NotificationPermission } from '../../../src/shared/models/NotificationPermission';

describe('SubscriptionManager', () => {
  describe('requestNotificationPermission', () => {
    beforeEach(() => {
      window.Notification = MockNotification;
    });

    test('default', async () => {
      MockNotification.permission = 'default';
      expect(await SubscriptionManager.requestNotificationPermission()).toBe(
        NotificationPermission.Default,
      );
    });

    test('denied', async () => {
      MockNotification.permission = 'denied';
      expect(await SubscriptionManager.requestNotificationPermission()).toBe(
        NotificationPermission.Denied,
      );
    });

    test('granted', async () => {
      MockNotification.permission = 'granted';
      expect(await SubscriptionManager.requestNotificationPermission()).toBe(
        NotificationPermission.Granted,
      );
    });
  });
});
