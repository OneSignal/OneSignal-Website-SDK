import {
  APP_ID,
  DUMMY_ONESIGNAL_ID,
  DUMMY_SUBSCRIPTION_ID,
} from '__test__/support/constants';
import TestContext from '__test__/support/environment/TestContext';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { mockOSMinifiedNotificationPayload } from '__test__/support/mocks/notifcations';
import { server } from '__test__/support/mocks/server';
import { http, HttpResponse } from 'msw';
import OneSignalApiBase from 'src/shared/api/OneSignalApiBase';
import { WorkerMessengerCommand } from 'src/shared/libraries/WorkerMessenger';
import {
  DEFAULT_DEVICE_ID,
  SubscriptionManager,
} from 'src/shared/managers/SubscriptionManager';
import { ConfigIntegrationKind } from 'src/shared/models/AppConfig';
import { DeliveryPlatformKind } from 'src/shared/models/DeliveryPlatformKind';
import { RawPushSubscription } from 'src/shared/models/RawPushSubscription';
import {
  ONESIGNAL_SESSION_KEY,
  Session,
  SessionOrigin,
  SessionStatus,
  UpsertOrDeactivateSessionPayload,
} from 'src/shared/models/Session';
import { SubscriptionStateKind } from 'src/shared/models/SubscriptionStateKind';
import { SubscriptionStrategyKind } from 'src/shared/models/SubscriptionStrategyKind';
import Database, {
  TABLE_NOTIFICATION_OPENED,
  TABLE_OUTCOMES_NOTIFICATION_CLICKED,
  TABLE_OUTCOMES_NOTIFICATION_RECEIVED,
  TABLE_SESSIONS,
} from 'src/shared/services/Database';
import Log from '../libraries/Log';
import { ServiceWorker } from './ServiceWorker';
import Environment from 'src/shared/helpers/Environment';

declare const self: ServiceWorkerGlobalScope;

const endpoint = 'https://example.com';
const appId = APP_ID;
const notificationId = 'test-notification-id';

vi.useFakeTimers();
vi.setSystemTime('2025-01-01T00:08:00.000Z');

describe('ServiceWorker', () => {
  beforeAll(async () => {
    await TestEnvironment.initialize();
    await Database.cleanupCurrentSession();
    await Database.put('Ids', {
      type: 'appId',
      id: appId,
    });

    // @ts-expect-error - Notification is not defined in the global scope
    global.Notification = {
      permission: 'granted',
    };
  });

  beforeEach(() => {
    // @ts-expect-error - search is readonly but we need to set it for testing
    self.location.search = '';
  });

  test('should have basic properties', () => {
    expect(ServiceWorker.VERSION).toBe(1);
    expect(ServiceWorker.environment).toBe(Environment);
    expect(ServiceWorker.database).toBe(Database);
    expect(ServiceWorker.log).toBe(Log);
  });

  describe('getAppId', () => {
    test('can return appId from url', async () => {
      // @ts-expect-error - search is readonly but we need to set it for testing
      self.location.search = '?appId=some-app-id';

      const appId = await ServiceWorker.getAppId();
      expect(appId).toBe('some-app-id');
    });
  });

  describe('activate event', () => {
    test('should call claim on activate', () => {
      const event = new ExtendableEvent('activate');
      self.dispatchEvent(event);

      expect(self.clients.claim).toHaveBeenCalled();
    });
  });

  describe('push event', () => {
    test('should handle push event errors', async () => {
      await self.dispatchEvent(new PushEvent('push'));

      // missing event.data
      await vi.runOnlyPendingTimersAsync();
      expect(logDebugSpy).toHaveBeenCalledWith(
        'Failed to display a notification:',
        'Missing event.data on push payload!',
      );

      // malformed event.data
      logDebugSpy.mockClear();
      await self.dispatchEvent(new PushEvent('push', 'some message'));
      await vi.runOnlyPendingTimersAsync();

      expect(logDebugSpy).toHaveBeenCalledWith(
        'Failed to display a notification:',
        'Unexpected push message payload received: some message',
      );

      // with missing notification id
      logDebugSpy.mockClear();
      await self.dispatchEvent(new PushEvent('push', {}));
      await vi.runOnlyPendingTimersAsync();
      expect(logDebugSpy).toHaveBeenCalledWith(
        'isValidPushPayload: Valid JSON but missing notification UUID:',
        {},
      );
    });

    test('should handle successful push event', async () => {
      const payload = mockOSMinifiedNotificationPayload();
      await self.dispatchEvent(new PushEvent('push', payload));
      await vi.advanceTimersByTimeAsync(10000);
      const notificationId = payload.custom.i;

      // db should mark the notification as received
      const notifcationReceived = await Database.getAll(
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
      await vi.advanceTimersByTimeAsync(10000);

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
      await vi.runOnlyPendingTimersAsync();

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
      const launchURL = 'http://some-launch-url.com';
      const event = new NotificationEvent('notificationclick', {
        action: 'test-action',
        data: {
          launchURL,
          notificationId,
        },
      });
      await self.dispatchEvent(event);
      await vi.runOnlyPendingTimersAsync();

      // should close the notification since it was clicked
      expect(notificationClose).toHaveBeenCalled();

      // should save clicked info to db
      const notificationClicked = await Database.getAll(
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
            launchURL,
            notificationId,
          },
          result: {
            actionId: undefined,
            url: launchURL,
          },
          timestamp: expect.any(Number),
        },
        pushSubscriptionId,
      );

      // should update DB and call open url
      const pendingUrlOpening = await Database.getAll(
        TABLE_NOTIFICATION_OPENED,
      );
      expect(pendingUrlOpening).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: notificationId,
            timestamp: expect.any(Number),
            url: launchURL,
          }),
        ]),
      );

      // should open url
      expect(self.clients.openWindow).toHaveBeenCalledWith(launchURL);
    });
  });

  describe('pushsubscriptionchange', () => {
    const registerSubscriptionCall = vi.spyOn(
      SubscriptionManager.prototype,
      'registerSubscription',
    );

    const someDeviceId = '123';

    beforeEach(() => {
      const serverConfig = TestContext.getFakeServerAppConfig(
        ConfigIntegrationKind.Custom,
        {
          features: {
            restrict_origin: {
              enable: false,
            },
          },
        },
      );

      server.use(
        http.get(`**/sync/*/web`, () => HttpResponse.json(serverConfig)),
      );
      server.use(
        http.post(`**/players`, () => HttpResponse.json({ id: someDeviceId })),
      );
    });

    test('with old subscription and no device id', async () => {
      server.use(
        http.post(`**/players`, () => HttpResponse.json({ id: null })),
      );

      await Database.put('Ids', {
        type: 'userId',
        id: null,
      });
      await Database.put('Ids', {
        type: 'registrationId',
        id: '456',
      });

      const event = new SubscriptionChangeEvent('pushsubscriptionchange', {
        oldSubscription: {},
      });
      await self.dispatchEvent(event);
      await vi.advanceTimersByTimeAsync(15000);

      // should remove previous ids
      const ids = await Database.getAll('Ids');
      expect(ids).toEqual([
        {
          type: 'appId',
          id: appId,
        },
      ]);
    });

    test('with old subscription and a device id', async () => {
      const subscribeCall = vi.spyOn(
        SubscriptionManager.prototype,
        'subscribe',
      );

      const event = new SubscriptionChangeEvent('pushsubscriptionchange', {
        oldSubscription: {},
      });

      await self.dispatchEvent(event);
      await vi.advanceTimersByTimeAsync(20000);

      expect(subscribeCall).toHaveBeenCalledWith(
        SubscriptionStrategyKind.SubscribeNew,
      );
      expect(registerSubscriptionCall).toHaveBeenCalledWith(
        undefined,
        SubscriptionStateKind.PushSubscriptionRevoked,
      );

      // the device id will be reset regardless of the old subscription state
      const subscription = await Database.getSubscription();
      expect(subscription.deviceId).toBe(DEFAULT_DEVICE_ID);
    });

    test('with new subscription ', async () => {
      server.use(
        http.post(`**/players`, () => HttpResponse.json({ id: null })),
      );

      // @ts-expect-error - normally readonly but doing this for testing
      global.Notification.permission = 'revoked';

      const event = new SubscriptionChangeEvent('pushsubscriptionchange', {
        newSubscription: {},
      });

      await self.dispatchEvent(event);
      await vi.runOnlyPendingTimersAsync();

      const [rawSubscription, subscriptionState] =
        registerSubscriptionCall.mock.calls[0];
      expect(rawSubscription).toBeInstanceOf(RawPushSubscription);
      expect(rawSubscription.w3cEndpoint?.href).toBe('https://example.com/');
      expect(rawSubscription.safariDeviceToken).toBeUndefined();
      expect(subscriptionState).toBe(SubscriptionStateKind.PermissionRevoked);
    });
  });

  describe('message event', () => {
    const baseMessagePayload = {
      appId: appId,
      enableSessionDuration: true,
      isSafari: true,
      onesignalId: DUMMY_ONESIGNAL_ID,
      outcomesConfig: {
        direct: {
          enabled: true,
        },
        indirect: {
          enabled: true,
          influencedNotificationsLimit: 10,
          influencedTimePeriodMin: 10,
        },
        unattributed: {
          enabled: true,
        },
      },
      sessionOrigin: SessionOrigin.UserCreate,
      sessionThreshold: 10,
      subscriptionId: DUMMY_SUBSCRIPTION_ID,
    };

    const session: Session = {
      accumulatedDuration: 0,
      appId,
      lastActivatedTimestamp: Date.now(),
      lastDeactivatedTimestamp: null,
      notificationId: null,
      sessionKey: ONESIGNAL_SESSION_KEY,
      startTimestamp: Date.now(),
      status: SessionStatus.Active,
    };

    const clickOutcome = {
      notification: {
        body: 'test',
        confirmDelivery: true,
        notificationId,
      },
      result: {
        actionId: undefined,
        url: 'test',
      },
      timestamp: Date.now(),
    };

    beforeEach(async () => {
      await Database.cleanupCurrentSession();
    });

    describe('session upsert event', () => {
      test('with safari client', async () => {
        const cancel = vi.fn();
        self.cancel = cancel;

        await Database.put(TABLE_SESSIONS, session);

        const event = new ExtendableMessageEvent('message', {
          command: WorkerMessengerCommand.SessionUpsert,
          payload:
            baseMessagePayload satisfies UpsertOrDeactivateSessionPayload,
        });
        await self.dispatchEvent(event);
        await vi.runOnlyPendingTimersAsync();

        // should cancel the previous calls
        expect(cancel).toHaveBeenCalled();

        // sends a worker message
        expect(postMessageFn).toHaveBeenCalledWith({
          command: WorkerMessengerCommand.AreYouVisible,
          payload: { timestamp: expect.any(Number) },
        });

        // should de-active session since can't determine focused window for Safari
        const updatedSession = (await Database.getCurrentSession())!;
        expect(updatedSession.status).toBe(SessionStatus.Inactive);
        expect(updatedSession.lastDeactivatedTimestamp).not.toBeNull();
        expect(updatedSession.accumulatedDuration).not.toBe(0);
      });

      test('with non-safari client', async () => {
        await Database.putNotificationClickedForOutcomes(appId, clickOutcome);

        const event = new ExtendableMessageEvent('message', {
          command: WorkerMessengerCommand.SessionUpsert,
          payload: {
            ...baseMessagePayload,
            isSafari: false,
          } satisfies UpsertOrDeactivateSessionPayload,
        });
        await self.dispatchEvent(event);
        await vi.runOnlyPendingTimersAsync();

        // should create a new session
        const updatedSession = (await Database.getCurrentSession())!;
        expect(updatedSession).toEqual(
          expect.objectContaining({
            accumulatedDuration: 0,
            appId,
            lastActivatedTimestamp: expect.any(Number),
            lastDeactivatedTimestamp: null,
            notificationId,
            sessionKey: ONESIGNAL_SESSION_KEY,
            startTimestamp: expect.any(Number),
            status: SessionStatus.Active,
          }),
        );
      });
    });

    describe('session deactivate event', () => {
      test('with no active sessions', async () => {
        matchAllFn.mockResolvedValueOnce([unfocusedClient]);

        const event = new ExtendableMessageEvent('message', {
          command: WorkerMessengerCommand.SessionDeactivate,
          payload: {
            ...baseMessagePayload,
            isSafari: false,
          } satisfies UpsertOrDeactivateSessionPayload,
        });
        await self.dispatchEvent(event);
        await vi.runOnlyPendingTimersAsync();

        expect(Log.debug).toHaveBeenCalledWith(
          'No active session found. Cannot deactivate.',
        );
      });

      test('with multiple active sessions', async () => {
        server.use(
          http.patch(`**/apps/${appId}/users/by/*/*`, () =>
            HttpResponse.json({}),
          ),
          http.post(`**/outcomes/measure`, () => HttpResponse.json({})),
        );

        matchAllFn.mockResolvedValueOnce([unfocusedClient]);
        await Database.put(TABLE_SESSIONS, {
          ...session,
          status: SessionStatus.Inactive,
        });
        await Database.putNotificationClickedForOutcomes(appId, clickOutcome);

        const event = new ExtendableMessageEvent('message', {
          command: WorkerMessengerCommand.SessionDeactivate,
          payload: {
            ...baseMessagePayload,
            isSafari: false,
          } satisfies UpsertOrDeactivateSessionPayload,
        });

        // debounces event
        self.dispatchEvent(event);
        self.dispatchEvent(event);

        // should finalize session then clean up sessions
        await vi.advanceTimersByTimeAsync(15000);
        const currentSession = await Database.getCurrentSession();
        const notificationClicked =
          await Database.getAllNotificationClickedForOutcomes();

        expect(currentSession).toBeNull();
        expect(notificationClicked).toEqual([]);
      });
    });
  });
});

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Spys
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const logDebugSpy = vi.spyOn(Log, 'debug');
// -- one signal api base mock
const apiPutSpy = vi.spyOn(OneSignalApiBase, 'put').mockResolvedValue({
  result: {},
  status: 200,
});

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Mock classes/helpers
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// -- webhook notification event sender mock
const mockSender = {
  willDisplay: vi.fn(),
  dismiss: vi.fn(),
  click: vi.fn(),
};
vi.mock(
  'src/sw/webhooks/notifications/OSWebhookNotificationEventSender',
  () => ({
    OSWebhookNotificationEventSender: vi
      .fn()
      .mockImplementation(() => mockSender),
  }),
);

// -- push subscription id mock
const pushSubscriptionId = '1234';
vi.mock('../helpers/ModelCacheDirectAccess', () => ({
  ModelCacheDirectAccess: {
    getPushSubscriptionIdByToken: vi
      .fn()
      .mockImplementation(() => pushSubscriptionId),
  },
}));

// -- browser info mock
const mockBowser = vi.fn().mockReturnValue({
  name: 'Safari',
  version: '18',
});
vi.mock('../../../src/shared/utils/bowserCastle', () => ({
  bowserCastle: () => mockBowser(),
}));

// -- awaitable timeout mock
vi.mock('../../../src/shared/utils/AwaitableTimeout', () => ({
  awaitableTimeout: vi.fn().mockResolvedValue(undefined),
}));

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Web api classes
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class ExtendableEvent extends Event {
  waitUntil(promise: Promise<any>) {
    return promise;
  }
}

const notificationClose = vi.fn();
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

class ExtendableMessageEvent extends ExtendableEvent {
  data: any;

  constructor(type: string, data?: any) {
    super(type);
    this.data = data;
  }
}

const baseSubscription = {
  endpoint: 'https://example.com',
  expirationTime: 1234567890,
  options: {
    applicationServerKey: null,
    userVisibleOnly: true,
  },
  getKey: vi.fn(),
  toJSON: vi.fn(),
  unsubscribe: vi.fn(),
};
class SubscriptionChangeEvent extends ExtendableEvent {
  oldSubscription: PushSubscription | null;
  newSubscription: PushSubscription | null;

  constructor(
    type: string,
    data?: {
      oldSubscription?: Partial<PushSubscription>;
      newSubscription?: Partial<PushSubscription>;
    },
  ) {
    super(type);
    this.oldSubscription = data?.oldSubscription
      ? { ...baseSubscription, ...data?.oldSubscription }
      : null;
    this.newSubscription = data?.newSubscription
      ? { ...baseSubscription, ...data?.newSubscription }
      : null;
  }
}

// Mock ExtendableEvent
global.ExtendableEvent = class extends Event {
  waitUntil(promise: Promise<any>) {
    return promise;
  }
};

Object.defineProperty(self, 'registration', {
  value: {
    pushManager: {
      getSubscription: vi.fn().mockResolvedValue({
        endpoint,
      }),
      permissionState: vi.fn().mockResolvedValue('granted'),
      subscribe: vi.fn().mockResolvedValue({
        endpoint,
      }),
    } satisfies PushManager,
    showNotification: vi.fn(),
  },
  writable: true,
});

// -- clients mock
const postMessageFn = vi.fn();
class Client {
  url: string;
  focused: boolean;
  constructor({
    focused = true,
    url = 'http://some-client-url.com',
  }: { focused?: boolean; url?: string } = {}) {
    this.focused = focused;
    this.url = url;
  }

  postMessage(message: any) {
    postMessageFn(message);
  }
}
const mockClient = new Client();
const unfocusedClient = new Client({ focused: false });
const matchAllFn = vi.fn().mockResolvedValue([mockClient]);

Object.defineProperty(self, 'clients', {
  value: {
    claim: vi.fn(),
    matchAll: matchAllFn,
    openWindow: vi.fn(),
  },
  writable: true, // Allow further modifications if needed
});

Object.defineProperty(self, 'location', {
  value: {
    search: '',
  },
  writable: true,
});
