import { APP_ID, ONESIGNAL_ID, SUB_ID } from '__test__/constants';
import TestContext from '__test__/support/environment/TestContext';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { MockServiceWorker } from '__test__/support/mocks/MockServiceWorker';
import { mockOSMinifiedNotificationPayload } from '__test__/support/mocks/notifcations';
import { server } from '__test__/support/mocks/server';
import { http, HttpResponse } from 'msw';
import * as OneSignalApiBase from 'src/shared/api/base';
import { ConfigIntegrationKind } from 'src/shared/config/constants';
import type { AppConfig } from 'src/shared/config/types';
import { db, getCurrentSession } from 'src/shared/database/client';
import {
  getAllNotificationClickedForOutcomes,
  putNotificationClickedForOutcomes,
} from 'src/shared/database/notifications';
import { getSubscription } from 'src/shared/database/subscription';
import Log from 'src/shared/libraries/Log';
import { WorkerMessengerCommand } from 'src/shared/libraries/workerMessenger/constants';
import { DEFAULT_DEVICE_ID } from 'src/shared/managers/subscription/constants';
import { SubscriptionManagerSW } from 'src/shared/managers/subscription/sw';
import { DeliveryPlatformKind } from 'src/shared/models/DeliveryPlatformKind';
import { RawPushSubscription } from 'src/shared/models/RawPushSubscription';
import { SubscriptionStrategyKind } from 'src/shared/models/SubscriptionStrategyKind';
import {
  ONESIGNAL_SESSION_KEY,
  SessionOrigin,
  SessionStatus,
} from 'src/shared/session/constants';
import type {
  Session,
  UpsertOrDeactivateSessionPayload,
} from 'src/shared/session/types';
import { NotificationType } from 'src/shared/subscriptions/constants';
import { getAppId, run } from './ServiceWorker';

// Mock webhook notification events
vi.mock('../webhooks/notifications/webhookNotificationEvent', () => ({
  notificationClick: vi.fn(),
  notificationDismissed: vi.fn(),
  notificationWillDisplay: vi.fn(),
}));

import {
  notificationClick,
  notificationDismissed,
  notificationWillDisplay,
} from '../webhooks/notifications/webhookNotificationEvent';
import type { OSServiceWorkerFields } from './types';

declare const self: ServiceWorkerGlobalScope & OSServiceWorkerFields;

const endpoint = 'https://example.com';
const appId = APP_ID;
const notificationId = 'test-notification-id';
const version = __VERSION__;

run();

vi.useFakeTimers();
vi.setSystemTime('2025-01-01T00:08:00.000Z');
vi.spyOn(Log, '_debug').mockImplementation(() => {});

const subscribeCall = vi.spyOn(SubscriptionManagerSW.prototype, '_subscribe');

let { isServiceWorker } = vi.hoisted(() => {
  return { isServiceWorker: false };
});
vi.mock('src/shared/utils/EnvVariables', async (importOriginal) => ({
  ...(await importOriginal()),
  get IS_SERVICE_WORKER() {
    return isServiceWorker;
  },
}));

const dispatchEvent = async (event: Event) => {
  self.dispatchEvent(event);

  // wait for the first setTimeout in the run method, then adds a 1s delay
  // since some cancelable timeouts are 0.5/1s and sometimes there are multiple cancelable timeouts
  // and plus we add some buffer time for IndexedDB operations
  await vi.advanceTimersByTimeAsync(1600);
};

const serverConfig = TestContext.getFakeServerAppConfig(
  ConfigIntegrationKind._Custom,
  {
    features: {
      restrict_origin: {
        enable: false,
      },
    },
  },
);

describe('ServiceWorker', () => {
  beforeAll(() => {
    TestEnvironment.initialize();

    // @ts-expect-error - Notification is not defined in the global scope
    global.Notification = {
      permission: 'granted',
    };
  });

  beforeEach(async () => {
    isServiceWorker = false;
    // await clearAll();
    await db.put('Ids', {
      type: 'appId',
      id: appId,
    });
    server.use(
      http.get(`**/sync/*/web`, () => HttpResponse.json(serverConfig)),
    );

    // @ts-expect-error - search is readonly but we need to set it for testing
    self.location.search = '';

    // @ts-expect-error - for setting sdk env to SW
    global.ServiceWorkerGlobalScope = {};
  });

  describe('getAppId', () => {
    test('can return appId from url', async () => {
      // @ts-expect-error - search is readonly but we need to set it for testing
      self.location.search = '?appId=some-app-id';

      const appId = await getAppId();
      expect(appId).toBe('some-app-id');
    });
  });

  describe('activate event', () => {
    test('should call claim on activate', () => {
      const event = new ExtendableEvent('activate');
      dispatchEvent(event);

      expect(self.clients.claim).toHaveBeenCalled();
    });
  });

  describe('push event', () => {
    test('should handle push event errors', async () => {
      await dispatchEvent(new PushEvent('push'));

      // missing event.data
      await vi.runOnlyPendingTimersAsync();
      expect(logDebugSpy).toHaveBeenCalledWith(
        'Failed to display a notification:',
        'Missing event.data on push payload!',
      );

      // malformed event.data
      logDebugSpy.mockClear();
      await dispatchEvent(new PushEvent('push', 'some message'));

      expect(logDebugSpy).toHaveBeenCalledWith(
        'Failed to display a notification:',
        'Unexpected push message payload received: some message',
      );

      // with missing notification id
      logDebugSpy.mockClear();
      await dispatchEvent(new PushEvent('push', {}));
      expect(logDebugSpy).toHaveBeenCalledWith(
        'isValidPushPayload: Valid JSON but missing notification UUID:',
        {},
      );
    });

    test('should handle successful push event', async () => {
      const payload = mockOSMinifiedNotificationPayload();
      await dispatchEvent(new PushEvent('push', payload));
      const notificationId = payload.custom.i;

      // db should mark the notification as received
      const notifcationReceived = await db.getAll(
        'Outcomes.NotificationReceived',
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
      expect(notificationWillDisplay).toHaveBeenCalledWith(
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
      const payload = mockOSMinifiedNotificationPayload({
        custom: {
          rr: 'y',
        },
      });
      await dispatchEvent(new PushEvent('push', payload));

      await vi.runOnlyPendingTimersAsync();

      expect(apiPutSpy).toHaveBeenCalledWith(
        `notifications/${payload.custom.i}/report_received`,
        {
          app_id: appId,
          device_type: DeliveryPlatformKind._ChromeLike,
          player_id: pushSubscriptionId,
        },
      );
    });

    describe('foregroundWillDisplay preventDefault', () => {
      test('should display notification when no page responds (timeout)', async () => {
        const showNotificationSpy = vi.spyOn(
          self.registration,
          'showNotification',
        );
        showNotificationSpy.mockClear();

        const payload = mockOSMinifiedNotificationPayload();
        await dispatchEvent(new PushEvent('push', payload));
        await vi.runOnlyPendingTimersAsync();

        // Notification should be displayed since no page called preventDefault
        expect(showNotificationSpy).toHaveBeenCalledWith(
          payload.title,
          expect.objectContaining({
            body: payload.alert,
          }),
        );
      });

      test('should prevent notification display when page responds with preventDefault=true', async () => {
        const showNotificationSpy = vi.spyOn(
          self.registration,
          'showNotification',
        );
        showNotificationSpy.mockClear();

        const payload = mockOSMinifiedNotificationPayload();
        const notificationId = payload.custom.i;

        // Simulate page responding with preventDefault=true
        // We simulate this by setting self.notificationDisplayStatus before the timeout
        const pushEvent = new PushEvent('push', payload);
        self.dispatchEvent(pushEvent);

        // Simulate page sending preventDefault response quickly (before timeout)
        setTimeout(() => {
          if (self.notificationDisplayStatus?.notificationId === notificationId) {
            self.notificationDisplayStatus.responded = true;
            self.notificationDisplayStatus.preventDefault = true;
          }
        }, 50); // Respond in 50ms (before 250ms timeout)

        await vi.advanceTimersByTimeAsync(1600);

        // Notification should NOT be displayed
        expect(showNotificationSpy).not.toHaveBeenCalled();

        // But confirmed delivery should still be sent (if enabled)
        // This is handled by the existing test
      });

      test('should display notification when page responds with preventDefault=false', async () => {
        const showNotificationSpy = vi.spyOn(
          self.registration,
          'showNotification',
        );
        showNotificationSpy.mockClear();

        const payload = mockOSMinifiedNotificationPayload();
        const notificationId = payload.custom.i;

        const pushEvent = new PushEvent('push', payload);
        self.dispatchEvent(pushEvent);

        // Simulate page responding with preventDefault=false
        setTimeout(() => {
          if (self.notificationDisplayStatus?.notificationId === notificationId) {
            self.notificationDisplayStatus.responded = true;
            self.notificationDisplayStatus.preventDefault = false;
          }
        }, 50);

        await vi.advanceTimersByTimeAsync(1600);

        // Notification should be displayed
        expect(showNotificationSpy).toHaveBeenCalledWith(
          payload.title,
          expect.objectContaining({
            body: payload.alert,
          }),
        );
      });
    });
  });

  describe('notificationclose', () => {
    test('should handle notificationclose event', async () => {
      const event = new NotificationEvent('notificationclose', {
        data: {
          notificationId,
        },
      });
      await dispatchEvent(event);

      expect(notificationDismissed).toHaveBeenCalledWith(
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
      await dispatchEvent(event);

      // should close the notification since it was clicked
      expect(notificationClose).toHaveBeenCalled();

      // should save clicked info to db
      const notificationClicked = await db.getAll(
        'Outcomes.NotificationClicked',
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
          device_type: DeliveryPlatformKind._ChromeLike,
          opened: true,
          player_id: pushSubscriptionId,
        },
      );

      // should emit clicked event
      expect(notificationClick).toHaveBeenCalledWith(
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

      // should open url
      expect(self.clients.openWindow).toHaveBeenCalledWith(launchURL);
    });
  });

  describe('pushsubscriptionchange', () => {
    const registerSubscriptionCall = vi.spyOn(
      SubscriptionManagerSW.prototype,
      '_registerSubscription',
    );

    const someDeviceId = '123';

    beforeEach(() => {
      server.use(
        http.post(`**/players`, () => HttpResponse.json({ id: someDeviceId })),
      );

      // @ts-expect-error - for setting sdk env
      global.ServiceWorkerGlobalScope = undefined;
    });

    test('with old subscription and no device id', async () => {
      subscribeCall.mockImplementationOnce(() => {
        throw new Error('cant get raw sub');
      });
      server.use(
        http.post(`**/players`, () => HttpResponse.json({ id: null })),
      );

      await db.put('Ids', {
        type: 'userId',
        id: null,
      });
      await db.put('Ids', {
        type: 'registrationId',
        id: '456',
      });

      const event = new SubscriptionChangeEvent('pushsubscriptionchange', {
        oldSubscription: {},
      });
      await dispatchEvent(event);

      // should remove previous ids
      const ids = await db.getAll('Ids');
      expect(ids).toEqual([
        {
          type: 'appId',
          id: appId,
        },
      ]);
    });

    test('with old subscription and a device id', async () => {
      subscribeCall.mockImplementationOnce(() => {
        throw new Error('cant get raw sub');
      });

      const event = new SubscriptionChangeEvent('pushsubscriptionchange', {
        oldSubscription: {},
      });

      await dispatchEvent(event);

      expect(subscribeCall).toHaveBeenCalledWith(
        SubscriptionStrategyKind._SubscribeNew,
      );
      expect(registerSubscriptionCall).toHaveBeenCalledWith(
        undefined,
        NotificationType._PushSubscriptionRevoked,
      );

      // the device id will be reset regardless of the old subscription state
      const subscription = await getSubscription();
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

      await dispatchEvent(event);

      const [rawSubscription, subscriptionState] =
        registerSubscriptionCall.mock.calls[0];
      expect(rawSubscription).toBeInstanceOf(RawPushSubscription);
      expect(rawSubscription?.w3cEndpoint?.href).toBe('https://example.com/');
      expect(rawSubscription?.safariDeviceToken).toBeUndefined();
      expect(subscriptionState).toBe(NotificationType._PermissionRevoked);
    });
  });

  describe('message event', () => {
    const baseMessagePayload = {
      appId: appId,
      enableSessionDuration: true,
      isSafari: true,
      onesignalId: ONESIGNAL_ID,
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
      sessionOrigin: SessionOrigin._UserCreate,
      sessionThreshold: 10,
      subscriptionId: SUB_ID,
    };

    const session: Session = {
      accumulatedDuration: 0,
      appId,
      lastActivatedTimestamp: Date.now(),
      lastDeactivatedTimestamp: null,
      notificationId: null,
      sessionKey: ONESIGNAL_SESSION_KEY,
      startTimestamp: Date.now(),
      status: SessionStatus._Active,
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

    beforeEach(async () => {});

    describe('session upsert event', () => {
      test('with safari client', async () => {
        const cancel = vi.fn();
        self.cancel = cancel;

        await db.put('Sessions', session);

        const event = new ExtendableMessageEvent('message', {
          command: WorkerMessengerCommand._SessionUpsert,
          payload:
            baseMessagePayload satisfies UpsertOrDeactivateSessionPayload,
        });
        await dispatchEvent(event);

        // should cancel the previous calls
        expect(cancel).toHaveBeenCalled();

        // sends a worker message
        expect(postMessageFn).toHaveBeenCalledWith({
          command: WorkerMessengerCommand._AreYouVisible,
          payload: { timestamp: expect.any(Number) },
        });

        // should de-active session since can't determine focused window for Safari
        const updatedSession = (await getCurrentSession())!;
        expect(updatedSession.status).toBe(SessionStatus._Inactive);
        expect(updatedSession.lastDeactivatedTimestamp).not.toBeNull();
        expect(updatedSession.accumulatedDuration).not.toBe(0);
      });

      test('with non-safari client', async () => {
        await putNotificationClickedForOutcomes(appId, clickOutcome);

        const event = new ExtendableMessageEvent('message', {
          command: WorkerMessengerCommand._SessionUpsert,
          payload: {
            ...baseMessagePayload,
            isSafari: false,
          } satisfies UpsertOrDeactivateSessionPayload,
        });
        await dispatchEvent(event);

        // should create a new session
        const updatedSession = (await getCurrentSession())!;
        expect(updatedSession).toEqual(
          expect.objectContaining({
            accumulatedDuration: 0,
            appId,
            lastActivatedTimestamp: expect.any(Number),
            lastDeactivatedTimestamp: null,
            notificationId,
            sessionKey: ONESIGNAL_SESSION_KEY,
            startTimestamp: expect.any(Number),
            status: SessionStatus._Active,
          }),
        );
      });
    });

    describe('session deactivate event', () => {
      test('with no active sessions', async () => {
        matchAllFn.mockResolvedValueOnce([unfocusedClient]);

        const event = new ExtendableMessageEvent('message', {
          command: WorkerMessengerCommand._SessionDeactivate,
          payload: {
            ...baseMessagePayload,
            isSafari: false,
          } satisfies UpsertOrDeactivateSessionPayload,
        });
        await dispatchEvent(event);

        expect(Log._debug).toHaveBeenCalledWith(
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
        await db.put('Sessions', {
          ...session,
          status: SessionStatus._Inactive,
        });
        await putNotificationClickedForOutcomes(appId, clickOutcome);

        const event = new ExtendableMessageEvent('message', {
          command: WorkerMessengerCommand._SessionDeactivate,
          payload: {
            ...baseMessagePayload,
            isSafari: false,
          } satisfies UpsertOrDeactivateSessionPayload,
        });

        // debounces event
        dispatchEvent(event);
        dispatchEvent(event);

        // should finalize session then clean up sessions
        await vi.advanceTimersByTimeAsync(15000);
        const currentSession = await getCurrentSession();
        const notificationClicked =
          await getAllNotificationClickedForOutcomes();

        expect(currentSession).toBeNull();
        expect(notificationClicked).toEqual([]);
      });
    });
  });

  describe('worker messenger', () => {
    const appConfig: AppConfig = {
      appId,
      hasUnsupportedSubdomain: false,
      origin: 'https://some-origin.com',
      siteName: 'Example',
      vapidPublicKey: '1234567890',
      userConfig: TestContext.getFakeAppUserConfig(),
    };
    const serializedSubscription = {
      createdAt: null,
      deviceId: DEFAULT_DEVICE_ID,
      expirationTime: null,
      optedOut: false,
      subscriptionToken: endpoint + '/',
    };

    beforeEach(async () => {
      isServiceWorker = true;
    });

    test('should send worker version message', async () => {
      const event = new ExtendableMessageEvent('message', {
        command: WorkerMessengerCommand._WorkerVersion,
      });
      await dispatchEvent(event);

      // should send a message to all clients
      expect(postMessageFn).toHaveBeenCalledWith({
        command: WorkerMessengerCommand._WorkerVersion,
        payload: version,
      });
    });

    test('should send subscribe message', async () => {
      const event = new ExtendableMessageEvent('message', {
        command: WorkerMessengerCommand._Subscribe,
        payload: appConfig,
      });
      await dispatchEvent(event);

      expect(postMessageFn).toHaveBeenCalledWith({
        command: WorkerMessengerCommand._Subscribe,
        payload: serializedSubscription,
      });
    });

    test('should send subscribe new message', async () => {
      const event = new ExtendableMessageEvent('message', {
        command: WorkerMessengerCommand._SubscribeNew,
        payload: appConfig,
      });

      await dispatchEvent(event);

      expect(postMessageFn).toHaveBeenCalledWith({
        command: WorkerMessengerCommand._SubscribeNew,
        payload: serializedSubscription,
      });
    });

    describe('are you visible response', () => {
      test('with no clients status', async () => {
        const event = new ExtendableMessageEvent('message', {
          command: WorkerMessengerCommand._AreYouVisibleResponse,
          payload: { focused: false, timestamp: Date.now() },
        });
        await dispatchEvent(event);

        expect(postMessageFn).not.toHaveBeenCalled();
      });

      test('with clients status', async () => {
        const timestamp = Date.now();

        self.clientsStatus = {
          hasAnyActiveSessions: false,
          timestamp,
          sentRequestsCount: 0,
          receivedResponsesCount: 0,
        };

        const event = new ExtendableMessageEvent('message', {
          command: WorkerMessengerCommand._AreYouVisibleResponse,
          payload: { focused: true, timestamp },
        });
        await dispatchEvent(event);

        // should set client status as active
        expect(postMessageFn).not.toHaveBeenCalled();
        expect(self.clientsStatus?.receivedResponsesCount).toBe(1);
        expect(self.clientsStatus?.hasAnyActiveSessions).toBe(true);
      });
    });

    test('should set logging', async () => {
      let event = new ExtendableMessageEvent('message', {
        command: WorkerMessengerCommand._SetLogging,
        payload: { shouldLog: true },
      });
      await dispatchEvent(event);
      expect(self.shouldLog).toBe(true);

      event = new ExtendableMessageEvent('message', {
        command: WorkerMessengerCommand._SetLogging,
        payload: { shouldLog: false },
      });
      await dispatchEvent(event);
      expect(self.shouldLog).toBe(undefined);
    });
  });
});

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const logDebugSpy = vi.spyOn(Log, '_debug');
// -- one signal api base mock

// @ts-expect-error - for mocking
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
    OSWebhookNotificationEventSender: class {
      willDisplay = mockSender.willDisplay;
      dismiss = mockSender.dismiss;
      click = mockSender.click;
    },
  }),
);

// -- push subscription id mock
const pushSubscriptionId = '1234';
vi.mock('./helpers', () => ({
  getPushSubscriptionIdByToken: vi
    .fn()
    .mockImplementation(() => pushSubscriptionId),
}));

// -- awaitable timeout mock
vi.mock('../../../src/shared/utils/AwaitableTimeout', () => ({
  awaitableTimeout: vi.fn().mockResolvedValue(undefined),
}));

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Web api classes
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
declare global {
  interface ServiceWorkerGlobalScope {
    clientsStatus?: {
      hasAnyActiveSessions: boolean;
      timestamp: number;
      receivedResponsesCount: number;
    };
    shouldLog?: boolean;
  }
}

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

const mockServiceWorker = {};
const getSubscriptionMock = vi
  .fn<() => Promise<PushSubscription | null>>()
  .mockResolvedValue({
    endpoint,
    expirationTime: Date.now(),
    options: {
      applicationServerKey: null,
      userVisibleOnly: true,
    },
    getKey: vi.fn(),
    toJSON: vi.fn(),
    unsubscribe: vi.fn().mockResolvedValue(true),
  });
Object.defineProperty(self, 'registration', {
  value: {
    active: mockServiceWorker,
    pushManager: {
      getSubscription: getSubscriptionMock,
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
  visibilityState: 'visible' | 'hidden';
  constructor({
    focused = true,
    url = 'http://some-client-url.com',
    visibilityState = 'visible',
  }: { focused?: boolean; url?: string; visibilityState?: 'visible' | 'hidden' } = {}) {
    this.focused = focused;
    this.url = url;
    this.visibilityState = visibilityState;
  }

  postMessage(message: any) {
    postMessageFn(message);
  }
}
const mockClient = new Client();
const unfocusedClient = new Client({ focused: false, visibilityState: 'hidden' });
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
Object.defineProperty(global.navigator, 'serviceWorker', {
  value: new MockServiceWorker(),
  writable: true,
});
Object.defineProperty(self, 'isSecureContext', {
  value: true,
  writable: true,
});
