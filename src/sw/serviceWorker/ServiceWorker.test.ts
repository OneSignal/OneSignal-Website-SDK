import { mockOSMinifiedNotificationPayload } from '__test__/support/mocks/notifcations';
import OneSignalApiBase from 'src/shared/api/OneSignalApiBase';
import { DeliveryPlatformKind } from 'src/shared/models/DeliveryPlatformKind';
import Database, {
  TABLE_NOTIFICATION_OPENED,
  TABLE_OUTCOMES_NOTIFICATION_CLICKED,
  TABLE_OUTCOMES_NOTIFICATION_RECEIVED,
} from 'src/shared/services/Database';
import Log from '../libraries/Log';
import { ServiceWorker } from './ServiceWorker';

declare const self: ServiceWorkerGlobalScope;

const endpoint = 'https://example.com';
const appId = 'test-app-id';
const notificationId = 'test-notification-id';

describe('ServiceWorker', () => {
  beforeAll(async () => {
    const db = Database.singletonInstance;
    await db.put('Ids', {
      type: 'appId',
      id: appId,
    });
  });

  beforeEach(() => {
    window.location.search = '';
  });

  describe('getAppId', () => {
    test('can return appId from url', async () => {
      window.location.search = '?appId=some-app-id';

      const appId = await ServiceWorker.getAppId();
      expect(appId).toBe('some-app-id');
    });
  });

  describe('activate', () => {
    test('should call claim on activate', () => {
      const event = new ExtendableEvent('activate');
      self.dispatchEvent(event);

      expect(self.clients.claim).toHaveBeenCalled();
    });
  });

  describe('push', () => {
    test('should handle push event errors', async () => {
      await self.dispatchEvent(new PushEvent('push'));

      // missing event.data
      await global.flushPromises();
      expect(logDebugSpy).toHaveBeenCalledWith(
        'Failed to display a notification:',
        'Missing event.data on push payload!',
      );

      // malformed event.data
      logDebugSpy.mockClear();
      await self.dispatchEvent(new PushEvent('push', 'some message'));
      await global.flushPromises();
      expect(logDebugSpy).toHaveBeenCalledWith(
        'Failed to display a notification:',
        'Unexpected push message payload received: some message',
      );

      // with missing notification id
      logDebugSpy.mockClear();
      await self.dispatchEvent(new PushEvent('push', {}));
      await global.flushPromises();
      expect(logDebugSpy).toHaveBeenCalledWith(
        'isValidPushPayload: Valid JSON but missing notification UUID:',
        {},
      );
    });

    test('should handle successful push event', async () => {
      const payload = mockOSMinifiedNotificationPayload();
      await self.dispatchEvent(new PushEvent('push', payload));
      await new Promise((resolve) => setTimeout(resolve, 100));

      const notificationId = payload.custom.i;

      // db should mark the notification as received
      const db = Database.singletonInstance;
      const notifcationReceived = await db.getAll(
        TABLE_OUTCOMES_NOTIFICATION_RECEIVED,
      );
      expect(notifcationReceived).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            appId,
            notificationId,
          }),
        ]),
      );

      // should trigger will display event
      const notificationInfo = {
        additionalData: payload.custom.a,
        body: payload.alert,
        icon: payload.icon,
        notificationId,
        title: payload.title,
      };
      expect(
        ServiceWorker.webhookNotificationEventSender.willDisplay,
      ).toHaveBeenCalledWith(
        expect.objectContaining(notificationInfo),
        pushSubscriptionId,
      );

      // should display the notification
      expect(self.registration.showNotification).toHaveBeenCalledWith(
        payload.title,
        expect.objectContaining({
          body: payload.alert,
          data: expect.objectContaining(notificationInfo),
          icon: payload.icon,
          tag: appId,
        }),
      );
    });

    test('should confirm delivery', async () => {
      mockBowser.mockReturnValue({
        name: 'Chrome',
        version: '130',
      });

      const payload = mockOSMinifiedNotificationPayload({
        custom: {
          rr: 'y',
        },
      });
      await self.dispatchEvent(new PushEvent('push', payload));
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(apiPutSpy).toHaveBeenCalledWith(
        `notifications/${payload.custom.i}/report_received`,
        {
          app_id: appId,
          device_type: DeliveryPlatformKind.ChromeLike,
          player_id: pushSubscriptionId,
        },
      );
    });
  });

  describe('notificationclose', () => {
    test('should handle notificationclose event', async () => {
      const event = new NotificationEvent('notificationclose', {
        data: {
          notificationId,
        },
      });
      await self.dispatchEvent(event);
      await global.flushPromises();

      expect(
        ServiceWorker.webhookNotificationEventSender.dismiss,
      ).toHaveBeenCalledWith(
        {
          notificationId,
        },
        pushSubscriptionId,
      );
    });
  });

  describe('notificationclick', () => {
    test('should handle notificationclick event', async () => {
      const event = new NotificationEvent('notificationclick', {
        data: {
          notificationId,
        },
      });
      await self.dispatchEvent(event);
      await global.flushPromises();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // should close the notification since it was clicked
      expect(notificationClose).toHaveBeenCalled();

      // should save clicked info to db
      const db = Database.singletonInstance;
      const notificationClicked = await db.getAll(
        TABLE_OUTCOMES_NOTIFICATION_CLICKED,
      );
      expect(notificationClicked).toEqual(
        expect.arrayContaining([
          {
            appId,
            notificationId,
            timestamp: expect.any(Number),
          },
        ]),
      );

      // should call api to report opened
      expect(apiPutSpy).toHaveBeenCalledWith(
        `notifications/${notificationId}`,
        {
          app_id: appId,
          device_type: DeliveryPlatformKind.ChromeLike,
          opened: true,
          player_id: pushSubscriptionId,
        },
      );

      // should emit clicked event
      expect(
        ServiceWorker.webhookNotificationEventSender.click,
      ).toHaveBeenCalledWith(
        {
          notification: {
            notificationId,
          },
          result: {
            actionId: undefined,
            url: 'http://localhost',
          },
          timestamp: expect.any(Number),
        },
        pushSubscriptionId,
      );

      // should update DB and call open url
      const pendingUrlOpening = await db.getAll(TABLE_NOTIFICATION_OPENED);
      expect(pendingUrlOpening).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: notificationId,
            timestamp: expect.any(Number),
            url: 'http://localhost',
          }),
        ]),
      );

      // should open url
      expect(self.clients.openWindow).toHaveBeenCalledWith('http://localhost');
    });
  });
});

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Spys
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const logDebugSpy = jest.spyOn(Log, 'debug');
// -- one signal api base mock
const apiPutSpy = jest.spyOn(OneSignalApiBase, 'put').mockResolvedValue({
  result: {},
  status: 200,
});

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Mock classes/helpers
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// -- webhook notification event sender mock
const mockSender = {
  willDisplay: jest.fn(),
  dismiss: jest.fn(),
  click: jest.fn(),
};
jest.mock(
  'src/sw/webhooks/notifications/OSWebhookNotificationEventSender',
  () => ({
    OSWebhookNotificationEventSender: jest
      .fn()
      .mockImplementation(() => mockSender),
  }),
);

// -- push subscription id mock
const pushSubscriptionId = '1234';
jest.mock('../helpers/ModelCacheDirectAccess', () => ({
  ModelCacheDirectAccess: {
    getPushSubscriptionIdByToken: jest
      .fn()
      .mockImplementation(() => pushSubscriptionId),
  },
}));

// -- browser info mock
const mockBowser = jest.fn().mockReturnValue({
  name: 'Safari',
  version: '18',
});
jest.mock('../../../src/shared/utils/bowserCastle', () => ({
  bowserCastle: () => mockBowser(),
}));

// -- awaitable timeout mock
jest.mock('../../../src/shared/utils/AwaitableTimeout', () => ({
  awaitableTimeout: jest.fn().mockResolvedValue(undefined),
}));

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Dom classes
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class ExtendableEvent extends Event {
  waitUntil(promise: Promise<any>) {
    return promise;
  }
}

const notificationClose = jest.fn();
class NotificationEvent extends ExtendableEvent {
  notification: {
    data: { id: string };
    close: () => void;
  };

  constructor(type: string, data: any) {
    super(type);
    this.notification = data;
    this.notification.close = notificationClose;
  }
}
class PushEvent extends ExtendableEvent {
  data: { json: () => any };

  constructor(type: string, data?: any) {
    super(type);

    if (typeof data === 'object') {
      this.data = { json: () => data };
    } else {
      this.data = data;
    }
  }
}

// window properties
const windowLocation = window.location;
Object.defineProperty(window, 'location', {
  value: {
    ...windowLocation,
  },
  writable: true,
});

// Mock ExtendableEvent
global.ExtendableEvent = class extends Event {
  waitUntil(promise: Promise<any>) {
    return promise;
  }
};

Object.defineProperty(self, 'registration', {
  value: {
    pushManager: {
      getSubscription: jest.fn().mockResolvedValue({
        endpoint,
      }),
      permissionState: jest.fn().mockResolvedValue('granted'),
      subscribe: jest.fn().mockResolvedValue({
        endpoint,
      }),
    } satisfies PushManager,
    showNotification: jest.fn(),
  },
  writable: true,
});

// -- clients mock
class Client {
  url: string;

  constructor(url: string) {
    this.url = url;
  }
}
const mockClient = new Client('http://some-client-url.com');

Object.defineProperty(self, 'clients', {
  value: {
    claim: jest.fn(),
    matchAll: () => Promise.resolve([mockClient]),
    openWindow: jest.fn(),
  },
  writable: true, // Allow further modifications if needed
});
