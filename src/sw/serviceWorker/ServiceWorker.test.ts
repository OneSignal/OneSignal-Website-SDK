import { APP_ID, EXTERNAL_ID, ONESIGNAL_ID, SUB_ID } from '__test__/constants';
import TestContext from '__test__/support/environment/TestContext';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import {
  getHandler,
  requestHeadersFn,
  setUpdateUserResponse,
  updateUserFn,
} from '__test__/support/helpers/requests';
import { installMockCacheStorage } from '__test__/support/mocks/MockCacheStorage';
import { MockServiceWorker } from '__test__/support/mocks/MockServiceWorker';
import { mockOSMinifiedNotificationPayload } from '__test__/support/mocks/notifcations';
import { server } from '__test__/support/mocks/server';
import { http, HttpResponse } from 'msw';
import { OperationRepo } from 'src/core/operationRepo/OperationRepo';
import * as OneSignalApiBase from 'src/shared/api/base';
import { updateUserSession } from 'src/shared/api/sw';
import { ConfigIntegrationKind } from 'src/shared/config/constants';
import { JwtRequirement } from 'src/shared/config/jwtRequirement';
import type { AppConfig } from 'src/shared/config/types';
import { db, getCurrentSession } from 'src/shared/database/client';
import {
  getAllNotificationClickedForOutcomes,
  putNotificationClickedForOutcomes,
} from 'src/shared/database/notifications';
import { getSubscription } from 'src/shared/database/subscription';
import { FeatureFlag } from 'src/shared/features/featureFlags';
import {
  deactivateSession,
  sendSessionHeartbeat,
  serializeSessionRefresh,
  upsertSession,
} from 'src/shared/helpers/service-worker';
import Log from 'src/shared/libraries/Log';
import { WorkerMessengerCommand } from 'src/shared/libraries/workerMessenger/constants';
import { WorkerMessengerSW } from 'src/shared/libraries/workerMessenger/sw';
import { DEFAULT_DEVICE_ID } from 'src/shared/managers/subscription/constants';
import { SubscriptionManagerSW } from 'src/shared/managers/subscription/sw';
import { DeliveryPlatformKind } from 'src/shared/models/DeliveryPlatformKind';
import { RawPushSubscription } from 'src/shared/models/RawPushSubscription';
import { SubscriptionStrategyKind } from 'src/shared/models/SubscriptionStrategyKind';
import {
  DEFAULT_HEARTBEAT_INTERVAL_SECONDS,
  ONESIGNAL_SESSION_KEY,
  SessionOrigin,
  SessionStatus,
} from 'src/shared/session/constants';
import type {
  Session,
  SessionOriginValue,
  UpsertOrDeactivateSessionPayload,
} from 'src/shared/session/types';
import { NotificationType, SubscriptionType } from 'src/shared/subscriptions/constants';
import { cancelableTimeout } from 'src/sw/helpers/CancelableTimeout';
import { enqueueSessionUpdate } from 'src/sw/sessionRequests/queue';
import { drainSessionRequests } from 'src/sw/sessionRequests/sender';
import type { CreateSessionRequestRecord } from 'src/sw/sessionRequests/types';
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vite-plus/test';

import { getAppId, NOTIFICATION_WILL_DISPLAY_TIMEOUT_MS, run } from './ServiceWorker';

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

vi.mock('src/shared/helpers/general', async (importOriginal) => {
  const mod = await importOriginal<typeof import('src/shared/helpers/general')>();
  return { ...mod, delay: vi.fn(() => Promise.resolve()) };
});

vi.spyOn(OperationRepo.prototype, '_start').mockResolvedValue(undefined);

vi.mock('src/sw/helpers/CancelableTimeout', () => ({
  cancelableTimeout: vi.fn((callback: () => Promise<void>) => {
    let cancelled = false;
    const promise = new Promise<void>((resolve) => {
      queueMicrotask(async () => {
        if (!cancelled) {
          try {
            await callback();
          } catch {
            // no-op
          }
        }
        resolve();
      });
    });
    return {
      promise,
      cancel: () => {
        cancelled = true;
      },
    };
  }),
}));

vi.mock('src/sw/sessionRequests/sender', () => ({
  drainSessionRequests: vi.fn(() => Promise.resolve()),
}));

run();

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

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

// setImmediate so this still works when tests fake setTimeout
const flush = async () => {
  for (let i = 0; i < 20; i++) {
    await new Promise<void>((r) => setImmediate(r));
  }
};

const dispatchEvent = async (event: Event) => {
  self.dispatchEvent(event);
  await flush();
};

const broadcastSpy = vi.spyOn(WorkerMessengerSW.prototype, '_broadcast');

const hasBroadcastWillDisplay = () =>
  broadcastSpy.mock.calls.some(
    ([command]) => command === WorkerMessengerCommand._NotificationWillDisplay,
  );

// Waits for the will-display broadcast, then answers it like a page that runs the SDK.
const respondToDisplayCheck = async (notificationId: string, preventDefault: boolean) => {
  while (!hasBroadcastWillDisplay()) {
    await tick();
  }
  isServiceWorker = true;
  await dispatchEvent(
    new ExtendableMessageEvent('message', {
      command: WorkerMessengerCommand._NotificationWillDisplayResponse,
      payload: { notificationId, preventDefault },
    }),
  );
};

const serverConfig = TestContext.getFakeServerAppConfig(ConfigIntegrationKind._Custom, {
  features: {
    restrict_origin: {
      enable: false,
    },
  },
});

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
    await db.put('Ids', {
      type: 'appId',
      id: appId,
    });
    server.use(http.get(`**/sync/*/web`, () => HttpResponse.json(serverConfig)));

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
    test('should call claim on activate', async () => {
      const event = new ExtendableEvent('activate');
      await dispatchEvent(event);

      expect(claimFn).toHaveBeenCalled();
    });
  });

  test('drains queued session requests when back online', async () => {
    vi.mocked(drainSessionRequests).mockClear();
    await dispatchEvent(new Event('online'));
    expect(drainSessionRequests).toHaveBeenCalledTimes(1);
  });

  describe('push event', () => {
    test('should handle push event errors', async () => {
      self.dispatchEvent(new PushEvent('push'));
      await flush();
      expect(logDebugSpy).toHaveBeenCalledWith(
        'Failed to display notif:',
        'Missing event.data on push payload!',
      );

      logDebugSpy.mockClear();
      self.dispatchEvent(new PushEvent('push', 'some message'));
      await flush();
      expect(logDebugSpy).toHaveBeenCalledWith(
        'Failed to display notif:',
        'Unexpected push message payload received: "some message"',
      );

      logDebugSpy.mockClear();
      self.dispatchEvent(new PushEvent('push', {}));
      await flush();
      expect(logDebugSpy).toHaveBeenCalledWith('Valid JSON missing UUID:', {});
    });

    test('should handle successful push event', async () => {
      const showNotificationSpy = vi.spyOn(self.registration, 'showNotification');
      const payload = mockOSMinifiedNotificationPayload();

      self.dispatchEvent(new PushEvent('push', payload));

      await respondToDisplayCheck(payload.custom.i, false);

      await flush();

      const notificationId = payload.custom.i;

      // db should mark the notification as received
      const notifcationReceived = await db.getAll('Outcomes.NotificationReceived');
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
      expect(showNotificationSpy).toHaveBeenCalledWith(
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

      self.dispatchEvent(new PushEvent('push', payload));

      await respondToDisplayCheck(payload.custom.i, false);

      await flush();

      expect(apiPutSpy).toHaveBeenCalledWith(
        ['notifications', payload.custom.i, 'report_received'],
        {
          app_id: appId,
          device_type: DeliveryPlatformKind._ChromeLike,
          player_id: pushSubscriptionId,
        },
      );
    });

    describe('foregroundWillDisplay preventDefault', () => {
      afterEach(() => {
        vi.useRealTimers();
      });

      test('should display notification when no visible clients exist', async () => {
        // Visibility check finds no visible clients — broadcast is skipped
        matchAllFn.mockResolvedValueOnce([unfocusedClient]);
        const showNotificationSpy = vi.spyOn(self.registration, 'showNotification');

        const payload = mockOSMinifiedNotificationPayload();
        await dispatchEvent(new PushEvent('push', payload));

        expect(showNotificationSpy).toHaveBeenCalledWith(
          payload.title,
          expect.objectContaining({
            body: payload.alert,
          }),
        );
      });

      test('should prevent notification display when page responds with preventDefault=true', async () => {
        const showNotificationSpy = vi.spyOn(self.registration, 'showNotification');

        const payload = mockOSMinifiedNotificationPayload({
          custom: {
            rr: 'y',
          },
        });
        const notificationId = payload.custom.i;

        const pushEvent = new PushEvent('push', payload);
        self.dispatchEvent(pushEvent);

        await respondToDisplayCheck(payload.custom.i, true);

        await flush();

        // Notification should NOT be displayed
        expect(showNotificationSpy).not.toHaveBeenCalled();

        expect(apiPutSpy).toHaveBeenCalledWith(
          ['notifications', notificationId, 'report_received'],
          {
            app_id: appId,
            device_type: expect.any(Number),
            player_id: pushSubscriptionId,
          },
        );
      });

      test('should display notification when page responds with preventDefault=false', async () => {
        const showNotificationSpy = vi.spyOn(self.registration, 'showNotification');

        const payload = mockOSMinifiedNotificationPayload();

        const pushEvent = new PushEvent('push', payload);
        self.dispatchEvent(pushEvent);

        await respondToDisplayCheck(payload.custom.i, false);

        await flush();

        // Notification should be displayed
        expect(showNotificationSpy).toHaveBeenCalledWith(
          payload.title,
          expect.objectContaining({
            body: payload.alert,
          }),
        );
      });

      test('should display notification when a visible page never responds', async () => {
        // e.g. a visible page in the service worker scope that does not load the SDK
        const showNotificationSpy = vi.spyOn(self.registration, 'showNotification');
        const payload = mockOSMinifiedNotificationPayload();
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

        self.dispatchEvent(new PushEvent('push', payload));
        await flush();
        await vi.advanceTimersByTimeAsync(NOTIFICATION_WILL_DISPLAY_TIMEOUT_MS - 1);
        await flush();
        expect(showNotificationSpy).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(1);
        await flush();
        expect(showNotificationSpy).toHaveBeenCalledWith(
          payload.title,
          expect.objectContaining({
            body: payload.alert,
          }),
        );
      });

      test('honors preventDefault when pushes overlap', async () => {
        const showNotificationSpy = vi.spyOn(self.registration, 'showNotification');
        const payloadA = mockOSMinifiedNotificationPayload({ title: 'A', custom: { i: 'id-a' } });
        const payloadB = mockOSMinifiedNotificationPayload({ title: 'B', custom: { i: 'id-b' } });
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

        self.dispatchEvent(new PushEvent('push', payloadA));
        self.dispatchEvent(new PushEvent('push', payloadB));
        await flush();

        isServiceWorker = true;
        self.dispatchEvent(
          new ExtendableMessageEvent('message', {
            command: WorkerMessengerCommand._NotificationWillDisplayResponse,
            payload: { notificationId: 'id-a', preventDefault: true },
          }),
        );
        self.dispatchEvent(
          new ExtendableMessageEvent('message', {
            command: WorkerMessengerCommand._NotificationWillDisplayResponse,
            payload: { notificationId: 'id-b', preventDefault: false },
          }),
        );
        await flush();

        // Past A's timeout, so a timer that was not cleared would show A
        await vi.advanceTimersByTimeAsync(NOTIFICATION_WILL_DISPLAY_TIMEOUT_MS);
        await flush();

        const titles = showNotificationSpy.mock.calls.map(([title]) => title);
        expect(titles).toEqual(['B']);
      });

      test('should display notification via display() after preventDefault', async () => {
        const showNotificationSpy = vi.spyOn(self.registration, 'showNotification');

        const payload = mockOSMinifiedNotificationPayload();
        const notificationId = payload.custom.i;

        const pushEvent = new PushEvent('push', payload);
        self.dispatchEvent(pushEvent);

        await respondToDisplayCheck(payload.custom.i, true);

        await flush();

        // Notification should NOT be displayed initially
        expect(showNotificationSpy).not.toHaveBeenCalled();

        // Now simulate the page calling display() by sending DisplayNotification
        isServiceWorker = true;
        const displayEvent = new ExtendableMessageEvent('message', {
          command: WorkerMessengerCommand._DisplayNotification,
          payload: {
            notification: {
              notificationId,
              title: payload.title,
              body: payload.alert,
              icon: payload.icon,
              confirmDelivery: false,
            },
          },
        });
        await dispatchEvent(displayEvent);

        // Notification should now be displayed
        expect(showNotificationSpy).toHaveBeenCalledWith(
          payload.title,
          expect.objectContaining({
            body: payload.alert,
          }),
        );
      });
    });

    describe('notification images', () => {
      const badge = 'https://example.com/badge.png';
      // Each URL gets its own bytes so a swapped icon and badge would fail.
      const dataUrlFor = (url: string) => `data:image/png;base64,${btoa(url)}`;
      const fetchMock = vi.fn<typeof fetch>();

      const enableInlineImages = () =>
        db.put('Options', {
          key: 'featureFlags',
          value: JSON.stringify([FeatureFlag._InlineNotificationImages]),
        });

      const displayPush = async (payload = mockOSMinifiedNotificationPayload({ badge })) => {
        matchAllFn.mockResolvedValueOnce([unfocusedClient]);
        const showNotificationSpy = vi.spyOn(self.registration, 'showNotification');
        await dispatchEvent(new PushEvent('push', payload));
        return showNotificationSpy.mock.calls[0]?.[1] as NotificationOptions;
      };

      beforeEach(() => {
        installMockCacheStorage();
        fetchMock.mockReset();
        fetchMock.mockImplementation((input) =>
          Promise.resolve(
            new Response(new TextEncoder().encode(input as string), {
              headers: { 'content-type': 'image/png' },
            }),
          ),
        );
        vi.stubGlobal('fetch', fetchMock);
      });

      afterEach(() => {
        vi.unstubAllGlobals();
      });

      test('without the flag, passes the remote URLs through and fetches nothing', async () => {
        const options = await displayPush();

        expect(options.icon).toBe('https://example.com/icon.png');
        expect(options.badge).toBe(badge);
        expect(fetchMock).not.toHaveBeenCalled();
      });

      test('without the flag, a stored default icon does not fill a missing icon', async () => {
        await db.put('Options', { key: 'defaultIcon', value: 'https://example.com/default.png' });
        const { icon: _icon, ...payload } = mockOSMinifiedNotificationPayload({ badge });

        const options = await displayPush(payload);

        expect(options.icon).toBeUndefined();
        expect(fetchMock).not.toHaveBeenCalled();
      });

      test('with the flag, passes the icon and badge as data URLs and keeps the URLs in data', async () => {
        await enableInlineImages();

        const options = await displayPush();

        expect(options.icon).toBe(dataUrlFor('https://example.com/icon.png'));
        expect(options.badge).toBe(dataUrlFor(badge));
        expect(options.data).toEqual(
          expect.objectContaining({ icon: 'https://example.com/icon.png', badgeIcon: badge }),
        );
      });

      describe('with the flag and a large image', () => {
        const defaultIcon = 'https://example.com/default-icon.png';
        const image = 'https://example.com/article.jpg';

        beforeEach(async () => {
          await enableInlineImages();
          await db.put('Options', { key: 'defaultIcon', value: defaultIcon });
        });

        test('inlines the app default icon when the payload has no icon', async () => {
          const { icon: _icon, ...payload } = mockOSMinifiedNotificationPayload({ badge, image });

          const options = await displayPush(payload);

          expect(options.icon).toBe(dataUrlFor(defaultIcon));
          // @ts-expect-error - image is not in the NotificationOptions type
          expect(options.image).toBe(image);
          expect(fetchMock).toHaveBeenCalledWith(defaultIcon, expect.anything());
        });

        test('inlines the icon when the payload icon is the app default icon', async () => {
          const options = await displayPush(
            mockOSMinifiedNotificationPayload({ badge, icon: defaultIcon, image }),
          );

          expect(options.icon).toBe(dataUrlFor(defaultIcon));
        });

        test('inlines a per-notification icon', async () => {
          const icon = 'https://example.com/other-icon.png';

          const options = await displayPush(
            mockOSMinifiedNotificationPayload({ badge, icon, image }),
          );

          expect(options.icon).toBe(dataUrlFor(icon));
          expect(options.badge).toBe(dataUrlFor(badge));
          // @ts-expect-error - image is not in the NotificationOptions type
          expect(options.image).toBe(image);
          expect(fetchMock).not.toHaveBeenCalledWith(image, expect.anything());
        });

        test('inlines the icon when the device has no stored default icon', async () => {
          await db.delete('Options', 'defaultIcon');
          const icon = 'https://example.com/other-icon.png';

          const options = await displayPush(
            mockOSMinifiedNotificationPayload({ badge, icon, image }),
          );

          expect(options.icon).toBe(dataUrlFor(icon));
          expect(fetchMock).not.toHaveBeenCalledWith(image, expect.anything());
        });

        test('leaves the icon as a remote URL when it is the image itself', async () => {
          const options = await displayPush(
            mockOSMinifiedNotificationPayload({ badge, icon: image, image }),
          );

          expect(options.icon).toBe(image);
          // @ts-expect-error - image is not in the NotificationOptions type
          expect(options.image).toBe(image);
          expect(fetchMock).toHaveBeenCalledTimes(1);
        });
      });

      test('with the flag, falls back to the remote URL when the fetch fails', async () => {
        await enableInlineImages();
        fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

        const options = await displayPush();

        expect(options.icon).toBe('https://example.com/icon.png');
        expect(options.badge).toBe(badge);
      });

      test('keeps an icon URL that the URL parser rejects', async () => {
        const errorSpy = vi.spyOn(Log, '_error').mockImplementation(() => {});

        const options = await displayPush(mockOSMinifiedNotificationPayload({ icon: 'not a url' }));

        expect(options.icon).toBe('not a url');
        expect(errorSpy).toHaveBeenCalledWith('ensureImageHttps:', expect.any(TypeError));
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
      const notificationClicked = await db.getAll('Outcomes.NotificationClicked');
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
      expect(apiPutSpy).toHaveBeenCalledWith(['notifications', notificationId], {
        app_id: appId,
        device_type: DeliveryPlatformKind._ChromeLike,
        opened: true,
        player_id: pushSubscriptionId,
      });

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
      expect(openWindowFn).toHaveBeenCalledWith(launchURL);
    });

    test('a click during an active session changes neither the session nor the next one', async () => {
      const active: Session = {
        accumulatedDuration: 5,
        appId,
        lastActivatedTimestamp: Date.now() - 10_000,
        lastDeactivatedTimestamp: null,
        notificationId: null,
        sessionKey: ONESIGNAL_SESSION_KEY,
        startTimestamp: Date.now() - 10_000,
        status: SessionStatus._Active,
      };
      await db.put('Sessions', active);
      const putSpy = vi.spyOn(db, 'put');

      await dispatchEvent(
        new NotificationEvent('notificationclick', {
          data: { launchURL: 'http://some-launch-url.com', notificationId },
        }),
      );

      expect(putSpy).not.toHaveBeenCalledWith('Sessions', expect.anything());
      expect(await getCurrentSession()).toEqual(active);
      // Not stored, so the next session cannot pick it up.
      expect(await db.getAll('Outcomes.NotificationClicked')).toEqual([]);
      putSpy.mockRestore();
    });

    test('a click while the session is inactive does not write the session', async () => {
      const inactive: Session = {
        accumulatedDuration: 5,
        appId,
        lastActivatedTimestamp: Date.now() - 10_000,
        lastDeactivatedTimestamp: Date.now() - 1_000,
        notificationId: null,
        sessionKey: ONESIGNAL_SESSION_KEY,
        startTimestamp: Date.now() - 10_000,
        status: SessionStatus._Inactive,
      };
      await db.put('Sessions', inactive);
      const putSpy = vi.spyOn(db, 'put');

      await dispatchEvent(
        new NotificationEvent('notificationclick', {
          data: { launchURL: 'http://some-launch-url.com', notificationId },
        }),
      );

      expect(putSpy).not.toHaveBeenCalledWith('Sessions', expect.anything());
      expect(await getCurrentSession()).toEqual(inactive);
      putSpy.mockRestore();
    });
  });

  describe('pushsubscriptionchange', () => {
    const registerSubscriptionCall = vi.spyOn(
      SubscriptionManagerSW.prototype,
      '_registerSubscription',
    );
    const playersFn = vi.fn();

    beforeEach(() => {
      server.use(
        http.post(`**/players`, () => {
          playersFn();
          return HttpResponse.json({ id: '123' });
        }),
      );

      // @ts-expect-error - for setting sdk env
      global.ServiceWorkerGlobalScope = undefined;
    });

    test('with old subscription and no device id: removes the ids without a legacy player lookup', async () => {
      subscribeCall.mockImplementationOnce(() => {
        throw new Error('cant get raw sub');
      });

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

      expect(playersFn).not.toHaveBeenCalled();
      expect(registerSubscriptionCall).not.toHaveBeenCalled();
      // should remove previous ids
      const ids = await db.getAll('Ids');
      expect(ids).toEqual([
        {
          type: 'appId',
          id: appId,
        },
      ]);
    });

    test('with old subscription and a stored device id', async () => {
      subscribeCall.mockImplementationOnce(() => {
        throw new Error('cant get raw sub');
      });
      await db.put('Ids', { type: 'userId', id: '123' });

      const event = new SubscriptionChangeEvent('pushsubscriptionchange', {
        oldSubscription: {},
      });

      await dispatchEvent(event);

      expect(playersFn).not.toHaveBeenCalled();
      expect(subscribeCall).toHaveBeenCalledWith(SubscriptionStrategyKind._SubscribeNew);
      expect(registerSubscriptionCall).toHaveBeenCalledWith(
        undefined,
        NotificationType._PushSubscriptionRevoked,
      );

      // the device id will be reset regardless of the old subscription state
      const subscription = await getSubscription();
      expect(subscription.deviceId).toBe(DEFAULT_DEVICE_ID);
    });

    test('with old and new subscription and no device id: registers the new subscription', async () => {
      await db.put('Ids', { type: 'userId', id: null });

      const event = new SubscriptionChangeEvent('pushsubscriptionchange', {
        oldSubscription: {},
        newSubscription: {},
      });
      await dispatchEvent(event);

      expect(playersFn).not.toHaveBeenCalled();
      expect(subscribeCall).not.toHaveBeenCalled();
      const [rawSubscription, subscriptionState] = registerSubscriptionCall.mock.calls[0];
      expect(rawSubscription).toBeInstanceOf(RawPushSubscription);
      expect(subscriptionState).toBeNull();
      const subscription = await getSubscription();
      expect(subscription.deviceId).toBe(DEFAULT_DEVICE_ID);
    });

    test('with new subscription ', async () => {
      // @ts-expect-error - normally readonly but doing this for testing
      global.Notification.permission = 'revoked';

      const event = new SubscriptionChangeEvent('pushsubscriptionchange', {
        newSubscription: {},
      });

      await dispatchEvent(event);

      const [rawSubscription, subscriptionState] = registerSubscriptionCall.mock.calls[0];
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
      sessionThreshold: 1,
      subscriptionId: SUB_ID,
      subscriptionType: SubscriptionType._ChromePush,
    };

    const session: Session = {
      accumulatedDuration: 0,
      appId,
      lastActivatedTimestamp: Date.now() - 2000,
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

    describe('session upsert event', () => {
      test('with safari client', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        const cancel = vi.fn();
        self.cancel = cancel;
        // The deactivate starts a finalize step that sends these requests. With no
        // handler they go to the network, retry for a long time, and the late
        // cleanupCurrentSession() deletes the Sessions store of a later test.
        setUpdateUserResponse();
        getHandler({ uri: '**/outcomes/measure', method: 'post', status: 200 });
        const putSpy = vi.spyOn(db, 'put');

        await db.put('Sessions', session);

        const event = new ExtendableMessageEvent('message', {
          command: WorkerMessengerCommand._SessionUpsert,
          payload: baseMessagePayload satisfies UpsertOrDeactivateSessionPayload,
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
        const deactivated = putSpy.mock.calls
          .map(([, value]) => value as Session)
          .find((value) => value.status === SessionStatus._Inactive);
        expect(deactivated?.lastDeactivatedTimestamp).toEqual(expect.any(Number));
        expect(deactivated?.accumulatedDuration).toBeGreaterThan(0);

        // the finalize step must finish inside this test
        await vi.waitFor(async () => expect(await getCurrentSession()).toBeNull());
        expect(updateUserFn).toHaveBeenCalledWith(
          expect.objectContaining({ deltas: { session_time: deactivated!.accumulatedDuration } }),
        );
      });

      test('with non-safari client', async () => {
        await putNotificationClickedForOutcomes(appId, clickOutcome);
        setUpdateUserResponse();

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

        expect(updateUserFn).toHaveBeenCalledWith({
          refresh_device_metadata: true,
          deltas: { session_count: 1 },
        });
      });

      // Creating a user does not seed session_count, so a newly created user needs this
      // increment just as much as a returning one.
      test.each([SessionOrigin._UserCreate, SessionOrigin._UserNewSession])(
        'sends the on_session increment for session origin %i',
        async (sessionOrigin) => {
          setUpdateUserResponse();

          const event = new ExtendableMessageEvent('message', {
            command: WorkerMessengerCommand._SessionUpsert,
            payload: {
              ...baseMessagePayload,
              isSafari: false,
              sessionOrigin,
            } satisfies UpsertOrDeactivateSessionPayload,
          });
          await dispatchEvent(event);

          expect(updateUserFn).toHaveBeenCalledTimes(1);
          expect(updateUserFn).toHaveBeenCalledWith({
            refresh_device_metadata: true,
            deltas: { session_count: 1 },
          });
        },
      );

      describe('session model', () => {
        const mirrorFlags = (flags: string[]) =>
          db.put('Options', { key: 'featureFlags', value: JSON.stringify(flags) });
        const upsert = (user: Partial<UpsertOrDeactivateSessionPayload> = {}) =>
          upsertSession({ ...baseMessagePayload, isSafari: false, ...user });

        beforeEach(() => {
          setUpdateUserResponse();
        });

        afterEach(async () => {
          await db.delete('Options', 'featureFlags');
        });

        test('a new session pins its IDs and uses the legacy path when the flag is off', async () => {
          await upsert();

          const current = await getCurrentSession();
          expect(current).toMatchObject({
            sessionId: expect.stringMatching(/^[0-9a-f-]{36}$/),
            usesSessionsApi: false,
            onesignalId: ONESIGNAL_ID,
            subscriptionId: SUB_ID,
          });
          expect(current?.serverSessionId).toBeUndefined();
        });

        test('a new session uses the sessions API when the flag is on', async () => {
          await mirrorFlags([FeatureFlag._SessionsV2ApiCutover]);

          await upsert();

          expect((await getCurrentSession())?.usesSessionsApi).toBe(true);
        });

        test('the flag and pinned IDs do not change mid-session', async () => {
          await upsert();
          const started = await getCurrentSession();

          await mirrorFlags([FeatureFlag._SessionsV2ApiCutover]);
          await upsert({ onesignalId: 'other-user', subscriptionId: 'other-subscription' });

          expect(await getCurrentSession()).toEqual(started);
        });

        test('a session after the threshold gets a new ID and re-reads the flag', async () => {
          getHandler({ uri: '**/outcomes/measure', method: 'post', status: 200 });
          await db.put('Sessions', {
            ...session,
            status: SessionStatus._Inactive,
            lastDeactivatedTimestamp: Date.now() - 60_000,
            sessionId: 'previous-session',
            usesSessionsApi: false,
            onesignalId: 'previous-user',
            subscriptionId: 'previous-subscription',
            serverSessionId: 'previous-server-session',
          });
          await mirrorFlags([FeatureFlag._SessionsV2ApiCutover]);

          await upsert();

          const current = (await getCurrentSession())!;
          expect(current.sessionId).not.toBe('previous-session');
          expect(current).toMatchObject({
            usesSessionsApi: true,
            onesignalId: ONESIGNAL_ID,
            subscriptionId: SUB_ID,
          });
          expect(current.serverSessionId).toBeUndefined();
        });

        test('a session stored without the new fields stays on the legacy path', async () => {
          await mirrorFlags([FeatureFlag._SessionsV2ApiCutover]);
          await db.put('Sessions', session);

          await upsert();

          const current = (await getCurrentSession())!;
          expect(current.usesSessionsApi).toBeUndefined();
          expect(current.sessionId).toBeUndefined();
        });
      });

      describe('sessions API start', () => {
        const enableSessionsApi = () =>
          db.put('Options', {
            key: 'featureFlags',
            value: JSON.stringify([FeatureFlag._SessionsV2ApiCutover]),
          });
        const upsert = (user: Partial<UpsertOrDeactivateSessionPayload> = {}) =>
          upsertSession({ ...baseMessagePayload, isSafari: false, ...user });
        const queued = () => db.getAll('SessionRequests');

        beforeEach(() => {
          setUpdateUserResponse();
          vi.mocked(drainSessionRequests).mockClear();
        });

        afterEach(async () => {
          await db.delete('Options', 'featureFlags');
        });

        test('a new session enqueues a create with its start time and pinned IDs, then drains', async () => {
          await enableSessionsApi();

          await upsert({ subscriptionType: SubscriptionType._SafariLegacyPush });

          const current = (await getCurrentSession())!;
          expect(await queued()).toEqual([
            expect.objectContaining({
              kind: 'create',
              appId,
              sessionId: current.sessionId,
              onesignalId: ONESIGNAL_ID,
              subscriptionId: SUB_ID,
              subscriptionType: SubscriptionType._SafariLegacyPush,
              startTime: current.startTimestamp,
              idempotencyKey: expect.stringMatching(/^[0-9a-f-]{36}$/),
            }),
          ]);
          expect(drainSessionRequests).toHaveBeenCalled();
          // The legacy start is still sent.
          expect(updateUserFn).toHaveBeenCalledWith(
            expect.objectContaining({ deltas: { session_count: 1 } }),
          );
        });

        test('upserts from other tabs during the session enqueue no second create', async () => {
          await enableSessionsApi();

          await upsert();
          await upsert();
          await upsert({ sessionOrigin: SessionOrigin._Focus });

          expect(await queued()).toHaveLength(1);
        });

        test('resuming within the threshold enqueues no create', async () => {
          await enableSessionsApi();
          await db.put('Sessions', {
            ...session,
            status: SessionStatus._Inactive,
            lastDeactivatedTimestamp: Date.now() - 1_000,
            sessionId: 'resumed-session',
            usesSessionsApi: true,
          });

          await upsert({ sessionThreshold: 30 });

          expect((await getCurrentSession())?.sessionId).toBe('resumed-session');
          expect(await queued()).toEqual([]);
        });

        test('a session after the threshold enqueues a create for the new session', async () => {
          getHandler({ uri: '**/outcomes/measure', method: 'post', status: 200 });
          await enableSessionsApi();
          await db.put('Sessions', {
            ...session,
            status: SessionStatus._Inactive,
            lastDeactivatedTimestamp: Date.now() - 60_000,
            sessionId: 'previous-session',
            usesSessionsApi: true,
          });

          await upsert({ sessionThreshold: 30 });

          const current = (await getCurrentSession())!;
          expect(current.sessionId).not.toBe('previous-session');
          expect(await queued()).toEqual([
            expect.objectContaining({ kind: 'create', sessionId: current.sessionId }),
          ]);
        });

        describe('notification attribution', () => {
          const storeClick = (timestamp = Date.now(), id = notificationId) =>
            db.put('Outcomes.NotificationClicked', { appId, notificationId: id, timestamp });
          const createRecord = async () =>
            (await queued()).find((r) => r.kind === 'create') as CreateSessionRequestRecord;
          const expiredSession = (lastDeactivatedTimestamp: number): Session => ({
            ...session,
            status: SessionStatus._Inactive,
            lastDeactivatedTimestamp,
            sessionId: 'previous-session',
            usesSessionsApi: true,
          });

          beforeEach(async () => {
            getHandler({ uri: '**/outcomes/measure', method: 'post', status: 200 });
            await enableSessionsApi();
          });

          test('a click that starts a new session sets the direct attribution id', async () => {
            await storeClick();

            await upsert();

            expect((await getCurrentSession())?.notificationId).toBe(notificationId);
            expect((await createRecord()).directAttributionId).toBe(notificationId);
          });

          test('a normal visit omits the direct attribution id', async () => {
            await upsert();

            expect((await createRecord()).directAttributionId).toBeUndefined();
          });

          test('a click after the session expired attributes the next session', async () => {
            const deactivatedAt = Date.now() - 60_000;
            await db.put('Sessions', expiredSession(deactivatedAt));
            await storeClick(Date.now() - 1_000);

            await upsert({ sessionThreshold: 30 });

            expect((await createRecord()).directAttributionId).toBe(notificationId);
            // Kept for the direct attribution of the new session's outcomes.
            expect(await db.getAll('Outcomes.NotificationClicked')).toHaveLength(1);
          });

          test('the latest of several recent clicks attributes the session', async () => {
            await storeClick(Date.now() - 5_000, 'a-older');
            await storeClick(Date.now(), 'z-newer');

            await upsert();

            expect((await createRecord()).directAttributionId).toBe('z-newer');
            expect(await db.getAll('Outcomes.NotificationClicked')).toEqual([
              expect.objectContaining({ notificationId: 'z-newer' }),
            ]);
          });

          test('a click that opened nothing does not attribute a later visit', async () => {
            await storeClick(Date.now() - 3 * 24 * 60 * 60 * 1000);

            await upsert();

            expect((await createRecord()).directAttributionId).toBeUndefined();
            expect(await db.getAll('Outcomes.NotificationClicked')).toEqual([]);
          });

          test('the finalize timer keeps a click made after the session went inactive', async () => {
            await db.put('Sessions', {
              ...expiredSession(0),
              status: SessionStatus._Active,
              lastActivatedTimestamp: Date.now() - 5_000,
              lastDeactivatedTimestamp: null,
            });
            let finalize: (() => Promise<void>) | undefined;
            vi.mocked(cancelableTimeout).mockImplementationOnce((callback) => {
              finalize = callback;
              return { promise: Promise.resolve(), cancel: vi.fn() };
            });
            await deactivateSession({ ...baseMessagePayload, isSafari: false });
            await storeClick(Date.now() - 60_000, 'previous-click');
            await storeClick(Date.now() + 1);

            await finalize!();
            expect(await db.getAll('Outcomes.NotificationClicked')).toEqual([
              expect.objectContaining({ notificationId }),
            ]);
            await upsert();

            expect((await createRecord()).directAttributionId).toBe(notificationId);
          });

          test('a click from before the previous session went inactive is not carried over', async () => {
            const deactivatedAt = Date.now() - 60_000;
            await db.put('Sessions', expiredSession(deactivatedAt));
            await storeClick(deactivatedAt - 1_000);

            await upsert({ sessionThreshold: 30 });

            expect((await createRecord()).directAttributionId).toBeUndefined();
          });

          test('a click that resumes a session within the threshold does not change it', async () => {
            await db.put('Sessions', {
              ...expiredSession(Date.now() - 1_000),
              sessionId: 'resumed-session',
            });
            await storeClick();

            await upsert({ sessionThreshold: 30 });

            const current = (await getCurrentSession())!;
            expect(current.sessionId).toBe('resumed-session');
            expect(current.notificationId).toBeNull();
            expect(await queued()).toEqual([]);
          });

          test('direct influence disabled: no attribution', async () => {
            await storeClick();

            await upsert({
              outcomesConfig: { ...baseMessagePayload.outcomesConfig, direct: { enabled: false } },
            });

            expect((await createRecord()).directAttributionId).toBeUndefined();
          });

          test('a deferred create carries the attribution of the session', async () => {
            await storeClick();
            await upsert({ onesignalId: 'local-user' });
            expect(await queued()).toEqual([]);

            await upsert();

            expect((await createRecord()).directAttributionId).toBe(notificationId);
          });
        });

        test('flag off: no create', async () => {
          await upsert();

          expect(await queued()).toEqual([]);
          expect(drainSessionRequests).not.toHaveBeenCalled();
          expect(updateUserFn).toHaveBeenCalledWith(
            expect.objectContaining({ deltas: { session_count: 1 } }),
          );
        });

        test.each([
          ['onesignal', { onesignalId: 'local-user' }],
          ['subscription', { subscriptionId: 'local-subscription' }],
        ])(
          'a session started with a local %s id enqueues its create on the next upsert with server ids',
          async (_, localIds) => {
            await enableSessionsApi();

            await upsert(localIds);
            expect(await queued()).toEqual([]);
            await upsert(localIds);
            expect(await queued()).toEqual([]);

            await upsert({ sessionOrigin: SessionOrigin._Focus });

            const current = (await getCurrentSession())!;
            expect(current).toMatchObject({ onesignalId: ONESIGNAL_ID, subscriptionId: SUB_ID });
            expect(await queued()).toEqual([
              expect.objectContaining({
                kind: 'create',
                sessionId: current.sessionId,
                onesignalId: ONESIGNAL_ID,
                subscriptionId: SUB_ID,
                startTime: current.startTimestamp,
              }),
            ]);

            await upsert();
            expect(await queued()).toHaveLength(1);
          },
        );

        const localSession = (overrides: Partial<Session> = {}): Session => ({
          ...session,
          sessionId: 'local-started',
          usesSessionsApi: true,
          onesignalId: 'local-user',
          subscriptionId: 'local-subscription',
          ...overrides,
        });

        test('a deferred create that cannot be queued keeps the local ids and is retried', async () => {
          await enableSessionsApi();
          await db.put('Sessions', localSession());

          await upsert({ subscriptionType: undefined });
          expect(await getCurrentSession()).toMatchObject({ onesignalId: 'local-user' });
          expect(await queued()).toEqual([]);

          await upsert();
          expect(await queued()).toEqual([
            expect.objectContaining({ kind: 'create', sessionId: 'local-started' }),
          ]);
        });

        test('a deferred create drains only after the session is resumed', async () => {
          await enableSessionsApi();
          await db.put(
            'Sessions',
            localSession({
              status: SessionStatus._Inactive,
              lastDeactivatedTimestamp: Date.now() - 1_000,
            }),
          );
          let statusAtDrain: string | undefined;
          vi.mocked(drainSessionRequests).mockImplementationOnce(async () => {
            statusAtDrain = (await getCurrentSession())?.status;
          });

          await upsert({ sessionThreshold: 30 });

          expect(statusAtDrain).toBe(SessionStatus._Active);
          expect((await getCurrentSession())?.sessionId).toBe('local-started');
        });

        test('an expired session started with local ids still gets its create', async () => {
          getHandler({ uri: '**/outcomes/measure', method: 'post', status: 200 });
          await enableSessionsApi();
          await db.put(
            'Sessions',
            localSession({
              status: SessionStatus._Inactive,
              lastDeactivatedTimestamp: Date.now() - 60_000,
            }),
          );

          await upsert({ sessionThreshold: 30 });

          const current = (await getCurrentSession())!;
          const byOrder = (await queued()).sort((a, b) => a.order - b.order);
          expect(byOrder.map((r) => [r.kind, r.sessionId])).toEqual([
            ['create', 'local-started'],
            ['update', 'local-started'],
            ['create', current.sessionId],
          ]);
        });

        test('a payload without a subscription type enqueues no create', async () => {
          await enableSessionsApi();

          await upsert({ subscriptionType: undefined });

          expect(await queued()).toEqual([]);
          expect(updateUserFn).toHaveBeenCalledWith(
            expect.objectContaining({ deltas: { session_count: 1 } }),
          );
        });

        test('a queue failure still sends the legacy session start', async () => {
          vi.spyOn(Log, '_error').mockImplementation(() => {});
          vi.spyOn(navigator.locks, 'request').mockImplementationOnce(() => {
            throw new TypeError('locks unavailable');
          });
          await enableSessionsApi();

          await upsert();

          expect(updateUserFn).toHaveBeenCalledWith(
            expect.objectContaining({ deltas: { session_count: 1 } }),
          );
        });
      });

      describe('sessions API end', () => {
        const queued = async () =>
          (await db.getAll('SessionRequests')).sort((a, b) => a.order - b.order);
        const deactivatedAt = Date.now() - 60_000;
        const apiSession = (overrides: Partial<Session> = {}): Session => ({
          ...session,
          status: SessionStatus._Inactive,
          lastDeactivatedTimestamp: deactivatedAt,
          accumulatedDuration: 42,
          sessionId: 'ending-session',
          usesSessionsApi: true,
          onesignalId: 'started-user',
          subscriptionId: 'started-subscription',
          ...overrides,
        });
        const deactivate = (payload: Partial<UpsertOrDeactivateSessionPayload> = {}) => {
          matchAllFn.mockResolvedValueOnce([unfocusedClient]);
          return dispatchEvent(
            new ExtendableMessageEvent('message', {
              command: WorkerMessengerCommand._SessionDeactivate,
              payload: {
                ...baseMessagePayload,
                isSafari: false,
                ...payload,
              } satisfies UpsertOrDeactivateSessionPayload,
            }),
          );
        };

        beforeEach(() => {
          setUpdateUserResponse();
          getHandler({ uri: '**/outcomes/measure', method: 'post', status: 200 });
          vi.mocked(drainSessionRequests).mockClear();
        });

        test('enqueues an end at the deactivate time with the final duration and pinned ids, then drains', async () => {
          await db.put('Sessions', apiSession());

          await deactivate();

          expect(await queued()).toEqual([
            expect.objectContaining({
              kind: 'update',
              appId,
              sessionId: 'ending-session',
              onesignalId: 'started-user',
              subscriptionId: 'started-subscription',
              durationSeconds: 42,
              endTime: deactivatedAt,
            }),
          ]);
          expect(drainSessionRequests).toHaveBeenCalled();
          expect(await getCurrentSession()).toBeNull();
          // The legacy duration is still sent.
          expect(updateUserFn).toHaveBeenCalledWith(
            expect.objectContaining({ deltas: { session_time: 42 } }),
          );
        });

        test('a session resumed before the threshold is not ended by the pending finalize', async () => {
          await db.put(
            'Sessions',
            apiSession({
              status: SessionStatus._Active,
              lastActivatedTimestamp: Date.now() - 5_000,
              lastDeactivatedTimestamp: null,
            }),
          );
          let finalize: (() => Promise<void>) | undefined;
          vi.mocked(cancelableTimeout).mockImplementationOnce((callback) => {
            finalize = callback;
            return { promise: Promise.resolve(), cancel: vi.fn() };
          });

          await deactivateSession({ ...baseMessagePayload, isSafari: false });
          await upsertSession({ ...baseMessagePayload, isSafari: false, sessionThreshold: 30 });
          await finalize!();

          expect((await getCurrentSession())!).toMatchObject({
            sessionId: 'ending-session',
            status: SessionStatus._Active,
          });
          expect((await queued()).filter((r) => r.kind === 'update' && r.endTime)).toEqual([]);
          expect(updateUserFn).not.toHaveBeenCalledWith(
            expect.objectContaining({ deltas: { session_time: expect.anything() } }),
          );
        });

        test('a session that resumed and went inactive again is not ended by the older finalize', async () => {
          await db.put(
            'Sessions',
            apiSession({
              status: SessionStatus._Active,
              lastActivatedTimestamp: Date.now() - 5_000,
              lastDeactivatedTimestamp: null,
            }),
          );
          let staleFinalize: (() => Promise<void>) | undefined;
          vi.mocked(cancelableTimeout).mockImplementationOnce((callback) => {
            staleFinalize = callback;
            return { promise: Promise.resolve(), cancel: vi.fn() };
          });

          await deactivateSession({ ...baseMessagePayload, isSafari: false });
          const firstInactive = (await getCurrentSession())!;
          await db.put('Sessions', {
            ...firstInactive,
            lastDeactivatedTimestamp: firstInactive.lastDeactivatedTimestamp! + 1_000,
          });
          await staleFinalize!();

          expect(await getCurrentSession()).toMatchObject({ sessionId: 'ending-session' });
          expect((await queued()).filter((r) => r.kind === 'update' && r.endTime)).toEqual([]);
        });

        test('replaces an unsent update and keeps the highest duration', async () => {
          await db.put('Sessions', apiSession());
          await enqueueSessionUpdate({
            appId,
            sessionId: 'ending-session',
            onesignalId: 'started-user',
            subscriptionId: 'started-subscription',
            durationSeconds: 30,
          });

          await deactivate();

          expect(await queued()).toEqual([
            expect.objectContaining({ durationSeconds: 42, endTime: deactivatedAt }),
          ]);
        });

        test('an expired session found on upsert ends before the next session is created', async () => {
          await db.put('Options', {
            key: 'featureFlags',
            value: JSON.stringify([FeatureFlag._SessionsV2ApiCutover]),
          });
          await db.put('Sessions', apiSession());

          await upsertSession({ ...baseMessagePayload, isSafari: false, sessionThreshold: 30 });
          await db.delete('Options', 'featureFlags');

          const current = (await getCurrentSession())!;
          expect((await queued()).map((r) => [r.kind, r.sessionId])).toEqual([
            ['update', 'ending-session'],
            ['create', current.sessionId],
          ]);
          expect((await queued())[0]).toMatchObject({ endTime: deactivatedAt });
        });

        test('an expired session found on upsert drains only after the next session is saved', async () => {
          await db.put('Sessions', apiSession());
          const sessionsAtDrain: (string | undefined)[] = [];
          vi.mocked(drainSessionRequests).mockImplementationOnce(async () => {
            sessionsAtDrain.push((await getCurrentSession())?.sessionId);
          });

          await upsertSession({ ...baseMessagePayload, isSafari: false, sessionThreshold: 30 });

          const current = (await getCurrentSession())!;
          expect(sessionsAtDrain.length).toBeGreaterThan(0);
          expect(sessionsAtDrain.every((id) => id === current.sessionId)).toBe(true);
        });

        test('two overlapping upserts on an expired session end it and start the next once', async () => {
          await db.put('Options', {
            key: 'featureFlags',
            value: JSON.stringify([FeatureFlag._SessionsV2ApiCutover]),
          });
          let releaseSessionTime!: () => void;
          const sessionTimeHeld = new Promise<void>((resolve) => (releaseSessionTime = resolve));
          server.use(
            http.patch(
              `**/apps/${appId}/users/by/onesignal_id/${ONESIGNAL_ID}`,
              async ({ request }) => {
                const body = (await request.json()) as { deltas: Record<string, number> };
                updateUserFn(body);
                if (body.deltas.session_time !== undefined) await sessionTimeHeld;
                return HttpResponse.json({});
              },
            ),
          );
          await db.put('Sessions', apiSession());
          const upsertMessage = () =>
            new ExtendableMessageEvent('message', {
              command: WorkerMessengerCommand._SessionUpsert,
              payload: {
                ...baseMessagePayload,
                isSafari: false,
                sessionThreshold: 30,
              } satisfies UpsertOrDeactivateSessionPayload,
            });

          await dispatchEvent(upsertMessage());
          await vi.waitUntil(() => updateUserFn.mock.calls.length === 1, { interval: 1 });
          await dispatchEvent(upsertMessage());
          releaseSessionTime();
          await vi.waitUntil(() => updateUserFn.mock.calls.length >= 2, { interval: 1 });
          await flush();
          await db.delete('Options', 'featureFlags');

          const deltas = updateUserFn.mock.calls.map(([body]) => Object.keys(body.deltas)[0]);
          expect(deltas).toEqual(['session_time', 'session_count']);
          const current = (await getCurrentSession())!;
          expect((await queued()).map((r) => [r.kind, r.sessionId])).toEqual([
            ['update', 'ending-session'],
            ['create', current.sessionId],
          ]);
        });

        test('a finalize that fires during an upsert waits for it and does not end the session twice', async () => {
          let releaseSessionTime!: () => void;
          const sessionTimeHeld = new Promise<void>((resolve) => (releaseSessionTime = resolve));
          server.use(
            http.patch(
              `**/apps/${appId}/users/by/onesignal_id/${ONESIGNAL_ID}`,
              async ({ request }) => {
                const body = (await request.json()) as { deltas: Record<string, number> };
                updateUserFn(body);
                if (body.deltas.session_time !== undefined) await sessionTimeHeld;
                return HttpResponse.json({});
              },
            ),
          );
          await db.put('Sessions', apiSession());
          let finalize: (() => Promise<void>) | undefined;
          vi.mocked(cancelableTimeout).mockImplementationOnce((callback) => {
            finalize = callback;
            return { promise: Promise.resolve(), cancel: vi.fn() };
          });
          await deactivateSession({
            ...baseMessagePayload,
            isSafari: false,
            sessionOrigin: SessionOrigin._Blur,
          });

          await dispatchEvent(
            new ExtendableMessageEvent('message', {
              command: WorkerMessengerCommand._SessionUpsert,
              payload: {
                ...baseMessagePayload,
                isSafari: false,
                sessionThreshold: 30,
              } satisfies UpsertOrDeactivateSessionPayload,
            }),
          );
          await vi.waitUntil(() => updateUserFn.mock.calls.length === 1, { interval: 1 });
          const finalized = finalize!();
          releaseSessionTime();
          await finalized;

          const deltas = updateUserFn.mock.calls.map(([body]) => Object.keys(body.deltas)[0]);
          expect(deltas).toEqual(['session_time', 'session_count']);
          expect((await queued()).filter((r) => r.kind === 'update')).toHaveLength(1);
          expect((await getCurrentSession())!.status).toBe(SessionStatus._Active);
        });

        test('a refresh still runs after the one before it rejects', async () => {
          const failed = serializeSessionRefresh(() => Promise.reject(new Error('refresh failed')));
          const next = serializeSessionRefresh(() => Promise.resolve('ran'));

          await expect(failed).rejects.toThrow('refresh failed');
          await expect(next).resolves.toBe('ran');
        });

        test('an active session ends at the deactivate time with the duration it adds', async () => {
          const activatedAt = Date.now() - 5_000;
          await db.put(
            'Sessions',
            apiSession({
              status: SessionStatus._Active,
              lastActivatedTimestamp: activatedAt,
              lastDeactivatedTimestamp: null,
            }),
          );

          const putSpy = vi.spyOn(db, 'put');

          await deactivate();

          const deactivated = putSpy.mock.calls
            .map(([, value]) => value as Session)
            .find((value) => value.status === SessionStatus._Inactive)!;
          expect(deactivated.lastDeactivatedTimestamp).toBeGreaterThanOrEqual(activatedAt + 5_000);
          expect(deactivated.accumulatedDuration).toBeGreaterThanOrEqual(42 + 5);
          expect(await queued()).toEqual([
            expect.objectContaining({
              kind: 'update',
              sessionId: 'ending-session',
              endTime: deactivated.lastDeactivatedTimestamp,
              durationSeconds: deactivated.accumulatedDuration,
            }),
          ]);
          expect(drainSessionRequests).toHaveBeenCalled();
        });

        test.each<[string, Partial<Session>, Partial<UpsertOrDeactivateSessionPayload>]>([
          ['a legacy session', { usesSessionsApi: false }, {}],
          [
            'a session stored by an older SDK',
            { usesSessionsApi: undefined, sessionId: undefined },
            {},
          ],
          ['a session that still has local ids', { onesignalId: 'local-user' }, {}],
          ['a page that sends no subscription type', {}, { subscriptionType: undefined }],
        ])('%s enqueues no end', async (_, overrides, payload) => {
          await db.put('Sessions', apiSession(overrides));

          await deactivate(payload);

          expect(await queued()).toEqual([]);
          expect(drainSessionRequests).not.toHaveBeenCalled();
          expect(await getCurrentSession()).toBeNull();
          expect(updateUserFn).toHaveBeenCalledWith(
            expect.objectContaining({ deltas: { session_time: 42 } }),
          );
        });
      });

      describe('sessions API checkpoint', () => {
        const queued = async () =>
          (await db.getAll('SessionRequests')).sort((a, b) => a.order - b.order);
        const activeSession = (overrides: Partial<Session> = {}): Session => ({
          ...session,
          accumulatedDuration: 10,
          lastActivatedTimestamp: Date.now() - 5_000,
          sessionId: 'checkpoint-session',
          usesSessionsApi: true,
          onesignalId: 'started-user',
          subscriptionId: 'started-subscription',
          ...overrides,
        });
        // Keeps the session open past the threshold, so only the checkpoint is queued.
        const deactivate = (payload: Partial<UpsertOrDeactivateSessionPayload> = {}) => {
          vi.mocked(cancelableTimeout).mockReturnValueOnce({
            promise: new Promise(() => {}),
            cancel: vi.fn(),
          });
          return deactivateSession({
            ...baseMessagePayload,
            isSafari: false,
            sessionOrigin: SessionOrigin._VisibilityHidden,
            ...payload,
          });
        };

        beforeEach(() => {
          vi.mocked(drainSessionRequests).mockClear();
        });

        test('going inactive enqueues the duration without an end time and keeps the session', async () => {
          await db.put('Sessions', activeSession());

          await deactivate();

          const current = (await getCurrentSession())!;
          expect(current.status).toBe(SessionStatus._Inactive);
          expect(current.accumulatedDuration).toBeGreaterThanOrEqual(15);
          expect(current.checkpointedDuration).toBe(current.accumulatedDuration);
          const [checkpoint, ...rest] = await queued();
          expect(rest).toEqual([]);
          expect(checkpoint).toMatchObject({
            kind: 'update',
            sessionId: 'checkpoint-session',
            onesignalId: 'started-user',
            subscriptionId: 'started-subscription',
            durationSeconds: current.accumulatedDuration,
          });
          expect(checkpoint).not.toHaveProperty('endTime', expect.anything());
          expect(drainSessionRequests).toHaveBeenCalled();
        });

        test('a deactivate while already inactive enqueues no second checkpoint', async () => {
          await db.put('Sessions', activeSession());

          await deactivate();
          await deactivate();

          expect(await queued()).toHaveLength(1);
        });

        test('a tab close enqueues a checkpoint', async () => {
          await db.put('Sessions', activeSession());

          await deactivate({ sessionOrigin: SessionOrigin._PageHide });

          expect(await queued()).toEqual([expect.objectContaining({ kind: 'update' })]);
        });

        test('a blur enqueues nothing, and the tab hiding later enqueues the checkpoint', async () => {
          await db.put('Sessions', activeSession());

          await deactivate({ sessionOrigin: SessionOrigin._Blur });

          const blurred = (await getCurrentSession())!;
          expect(blurred.status).toBe(SessionStatus._Inactive);
          expect(await queued()).toEqual([]);
          expect(drainSessionRequests).not.toHaveBeenCalled();

          await deactivate();

          expect(await queued()).toEqual([
            expect.objectContaining({ durationSeconds: blurred.accumulatedDuration }),
          ]);
          expect((await getCurrentSession())!.checkpointedDuration).toBe(
            blurred.accumulatedDuration,
          );
          expect(drainSessionRequests).toHaveBeenCalled();
        });

        test('a blur that reaches the worker after the hidden still checkpoints', async () => {
          await db.put('Sessions', activeSession());
          matchAllFn.mockResolvedValueOnce([unfocusedClient]);
          const debounce = vi.mocked(cancelableTimeout).getMockImplementation()!;
          vi.mocked(cancelableTimeout)
            .mockImplementationOnce(debounce)
            .mockImplementationOnce(debounce)
            .mockReturnValueOnce({ promise: new Promise(() => {}), cancel: vi.fn() });
          const message = (sessionOrigin: SessionOriginValue) =>
            new ExtendableMessageEvent('message', {
              command: WorkerMessengerCommand._SessionDeactivate,
              payload: {
                ...baseMessagePayload,
                isSafari: false,
                sessionOrigin,
              } satisfies UpsertOrDeactivateSessionPayload,
            });

          self.dispatchEvent(message(SessionOrigin._VisibilityHidden));
          self.dispatchEvent(message(SessionOrigin._Blur));
          await flush();

          expect(await queued()).toEqual([expect.objectContaining({ kind: 'update' })]);
          expect((await queued())[0]).not.toHaveProperty('endTime', expect.anything());
        });

        test('a blur that cancels the Safari visibility poll of a hide still checkpoints', async () => {
          await db.put('Sessions', activeSession());
          matchAllFn
            .mockResolvedValueOnce([unfocusedClient])
            .mockResolvedValueOnce([unfocusedClient]);
          const realTimeout = vi.mocked(cancelableTimeout).getMockImplementation()!;
          vi.mocked(cancelableTimeout)
            .mockImplementationOnce(realTimeout)
            .mockReturnValueOnce({ promise: new Promise(() => {}), cancel: vi.fn() })
            .mockImplementationOnce(realTimeout)
            .mockImplementationOnce(realTimeout)
            .mockReturnValueOnce({ promise: new Promise(() => {}), cancel: vi.fn() });
          const message = (sessionOrigin: SessionOriginValue) =>
            new ExtendableMessageEvent('message', {
              command: WorkerMessengerCommand._SessionDeactivate,
              payload: {
                ...baseMessagePayload,
                isSafari: true,
                sessionOrigin,
              } satisfies UpsertOrDeactivateSessionPayload,
            });

          await dispatchEvent(message(SessionOrigin._VisibilityHidden));
          expect((await getCurrentSession())!.status).toBe(SessionStatus._Active);
          await dispatchEvent(message(SessionOrigin._Blur));

          expect((await getCurrentSession())!.status).toBe(SessionStatus._Inactive);
          expect(await queued()).toEqual([expect.objectContaining({ kind: 'update' })]);
        });

        // A tab hides while another tab has focus, then the user leaves for another app.
        test('a blur queued behind a hide that found a focused tab is not taken as a hide', async () => {
          await db.put(
            'Sessions',
            activeSession({
              status: SessionStatus._Inactive,
              lastDeactivatedTimestamp: Date.now(),
              accumulatedDuration: 20,
              checkpointedDuration: 10,
            }),
          );
          let releaseRead!: () => void;
          const readHeld = new Promise<void>((resolve) => (releaseRead = resolve));
          const get = db.get.bind(db);
          vi.spyOn(db, 'get').mockImplementationOnce((async (...args: Parameters<typeof get>) => {
            await readHeld;
            return get(...args);
          }) as typeof db.get);
          matchAllFn.mockResolvedValueOnce([mockClient]).mockResolvedValueOnce([unfocusedClient]);
          const debounce = vi.mocked(cancelableTimeout).getMockImplementation()!;
          vi.mocked(cancelableTimeout)
            .mockImplementationOnce(debounce)
            .mockImplementationOnce(debounce)
            .mockReturnValueOnce({ promise: new Promise(() => {}), cancel: vi.fn() });
          const message = (sessionOrigin: SessionOriginValue) =>
            new ExtendableMessageEvent('message', {
              command: WorkerMessengerCommand._SessionDeactivate,
              payload: {
                ...baseMessagePayload,
                isSafari: false,
                sessionOrigin,
              } satisfies UpsertOrDeactivateSessionPayload,
            });

          await dispatchEvent(message(SessionOrigin._VisibilityHidden));
          await dispatchEvent(message(SessionOrigin._Blur));
          releaseRead();
          await flush();

          expect((await getCurrentSession())!.status).toBe(SessionStatus._Inactive);
          expect(await queued()).toEqual([]);
        });

        test('a hide does not restore a session that finalize deleted during the enqueue', async () => {
          await db.put(
            'Sessions',
            activeSession({
              status: SessionStatus._Inactive,
              lastDeactivatedTimestamp: Date.now(),
            }),
          );
          const locks = navigator.locks;
          const request = locks.request.bind(locks) as (
            name: string,
            fn: () => Promise<unknown>,
          ) => Promise<unknown>;
          vi.spyOn(locks, 'request').mockImplementationOnce((async (
            name: string,
            fn: () => Promise<unknown>,
          ) => {
            await db.delete('Sessions', ONESIGNAL_SESSION_KEY);
            return request(name, fn);
          }) as typeof locks.request);

          await expect(deactivate()).resolves.toBeUndefined();

          expect(await getCurrentSession()).toBeNull();
        });

        test('no checkpoint when the duration has not grown since the last one', async () => {
          await db.put(
            'Sessions',
            activeSession({ lastActivatedTimestamp: Date.now(), checkpointedDuration: 10 }),
          );

          await deactivate();

          expect(await queued()).toEqual([]);
          expect(drainSessionRequests).not.toHaveBeenCalled();
          expect((await getCurrentSession())!.status).toBe(SessionStatus._Inactive);
        });

        test('another focused tab keeps the session active and enqueues nothing', async () => {
          await db.put('Sessions', activeSession());
          matchAllFn.mockResolvedValueOnce([unfocusedClient, mockClient]);

          await dispatchEvent(
            new ExtendableMessageEvent('message', {
              command: WorkerMessengerCommand._SessionDeactivate,
              payload: {
                ...baseMessagePayload,
                isSafari: false,
              } satisfies UpsertOrDeactivateSessionPayload,
            }),
          );

          expect((await getCurrentSession())!.status).toBe(SessionStatus._Active);
          expect(await queued()).toEqual([]);
        });

        test.each<[string, Partial<Session>, Partial<UpsertOrDeactivateSessionPayload>]>([
          ['a legacy session', { usesSessionsApi: false }, {}],
          [
            'a session stored by an older SDK',
            { usesSessionsApi: undefined, sessionId: undefined },
            {},
          ],
          ['a session that still has local ids', { onesignalId: 'local-user' }, {}],
          ['a page that sends no subscription type', {}, { subscriptionType: undefined }],
        ])('%s enqueues no checkpoint', async (_, overrides, payload) => {
          await db.put('Sessions', activeSession(overrides));

          await deactivate(payload);

          expect(await queued()).toEqual([]);
          expect(drainSessionRequests).not.toHaveBeenCalled();
          const current = (await getCurrentSession())!;
          expect(current.status).toBe(SessionStatus._Inactive);
          expect(current.checkpointedDuration).toBeUndefined();
        });
      });

      describe('sessions API heartbeat', () => {
        const queued = async () =>
          (await db.getAll('SessionRequests')).sort((a, b) => a.order - b.order);
        // Active this long in the current focus, on top of the stored duration.
        const activeSession = (
          focusSeconds: number,
          overrides: Partial<Session> = {},
        ): Session => ({
          ...session,
          accumulatedDuration: 100,
          lastActivatedTimestamp: Date.now() - focusSeconds * 1000,
          sessionId: 'heartbeat-session',
          usesSessionsApi: true,
          onesignalId: 'started-user',
          subscriptionId: 'started-subscription',
          ...overrides,
        });
        const heartbeat = (payload: Partial<UpsertOrDeactivateSessionPayload> = {}) =>
          sendSessionHeartbeat({
            ...baseMessagePayload,
            sessionOrigin: SessionOrigin._Heartbeat,
            ...payload,
          });

        beforeEach(() => {
          vi.mocked(drainSessionRequests).mockClear();
        });

        afterEach(() => {
          vi.useRealTimers();
        });

        test('an interval of active time enqueues the cumulative duration without an end time', async () => {
          await db.put('Sessions', activeSession(DEFAULT_HEARTBEAT_INTERVAL_SECONDS));

          await heartbeat();

          const current = (await getCurrentSession())!;
          expect(current.status).toBe(SessionStatus._Active);
          expect(current.accumulatedDuration).toBe(100);
          const [update, ...rest] = await queued();
          expect(rest).toEqual([]);
          expect(update).toMatchObject({
            kind: 'update',
            sessionId: 'heartbeat-session',
            onesignalId: 'started-user',
            subscriptionId: 'started-subscription',
          });
          expect(update).not.toHaveProperty('endTime', expect.anything());
          const duration = current.checkpointedDuration!;
          expect(duration).toBeGreaterThanOrEqual(100 + DEFAULT_HEARTBEAT_INTERVAL_SECONDS);
          expect(update).toMatchObject({ durationSeconds: duration });
          expect(drainSessionRequests).toHaveBeenCalled();
        });

        test('a tick a little short of the interval still sends', async () => {
          await db.put('Sessions', activeSession(DEFAULT_HEARTBEAT_INTERVAL_SECONDS - 5));

          await heartbeat();

          expect(await queued()).toHaveLength(1);
        });

        test('uses the interval the page sends', async () => {
          await db.put('Sessions', activeSession(240, { checkpointedDuration: 100 }));
          await heartbeat({ heartbeatInterval: 300 });
          expect(await queued()).toHaveLength(0);

          await db.put('Sessions', activeSession(300, { checkpointedDuration: 100 }));
          await heartbeat({ heartbeatInterval: 300 });
          expect(await queued()).toHaveLength(1);
        });

        test('a short interval still waits most of it', async () => {
          await db.put('Sessions', activeSession(30, { checkpointedDuration: 100 }));
          await heartbeat({ heartbeatInterval: 60 });
          expect(await queued()).toHaveLength(0);

          await db.put('Sessions', activeSession(55, { checkpointedDuration: 100 }));
          await heartbeat({ heartbeatInterval: 60 });
          expect(await queued()).toHaveLength(1);
        });

        test('ticks from several tabs within one interval send once', async () => {
          await db.put('Sessions', activeSession(DEFAULT_HEARTBEAT_INTERVAL_SECONDS));

          await heartbeat();
          await heartbeat();

          expect(await queued()).toHaveLength(1);
        });

        test('ticks from two tabs at the same moment send once', async () => {
          await db.put('Sessions', activeSession(DEFAULT_HEARTBEAT_INTERVAL_SECONDS));

          await Promise.all([heartbeat(), heartbeat()]);

          expect(await queued()).toHaveLength(1);
          expect(drainSessionRequests).toHaveBeenCalledOnce();
        });

        test('the interval counts from the last duration sent', async () => {
          await db.put(
            'Sessions',
            activeSession(DEFAULT_HEARTBEAT_INTERVAL_SECONDS / 2, { checkpointedDuration: 100 }),
          );
          await heartbeat();
          expect(await queued()).toEqual([]);

          await db.put(
            'Sessions',
            activeSession(DEFAULT_HEARTBEAT_INTERVAL_SECONDS, { checkpointedDuration: 100 }),
          );
          await heartbeat();
          expect(await queued()).toHaveLength(1);
        });

        test('a failed enqueue keeps the last duration sent, so the next tick retries', async () => {
          vi.spyOn(Log, '_error').mockImplementation(() => {});
          await db.put(
            'Sessions',
            activeSession(DEFAULT_HEARTBEAT_INTERVAL_SECONDS, { checkpointedDuration: 100 }),
          );
          const put = db.put.bind(db);
          const putSpy = vi
            .spyOn(db, 'put')
            .mockImplementation((store, value) =>
              store === 'SessionRequests'
                ? Promise.reject(new Error('quota'))
                : put(store, value as never),
            );

          await heartbeat();
          expect((await getCurrentSession())!.checkpointedDuration).toBe(100);

          putSpy.mockRestore();
          await heartbeat();
          expect(await queued()).toHaveLength(1);
        });

        test('a hide right after a heartbeat sends no second update', async () => {
          vi.useFakeTimers({ toFake: ['Date'] });
          await db.put('Sessions', activeSession(DEFAULT_HEARTBEAT_INTERVAL_SECONDS));
          await heartbeat();
          const sent = (await getCurrentSession())!.checkpointedDuration!;

          vi.mocked(cancelableTimeout).mockReturnValueOnce({
            promise: new Promise(() => {}),
            cancel: vi.fn(),
          });
          await deactivateSession({
            ...baseMessagePayload,
            isSafari: false,
            sessionOrigin: SessionOrigin._VisibilityHidden,
          });

          const updates = await queued();
          expect(updates).toHaveLength(1);
          expect((await getCurrentSession())!.checkpointedDuration).toBe(sent);
        });

        test.each<[string, Partial<Session>, Partial<UpsertOrDeactivateSessionPayload>]>([
          ['an inactive session', { status: SessionStatus._Inactive }, {}],
          ['a session on the legacy path', { usesSessionsApi: false }, {}],
          [
            'a session stored by an older SDK',
            { sessionId: undefined, usesSessionsApi: undefined },
            {},
          ],
          ['a session that still has local ids', { onesignalId: 'local-user' }, {}],
          ['a page that sends no subscription type', {}, { subscriptionType: undefined }],
        ])('%s sends no heartbeat', async (_, overrides, payload) => {
          await db.put('Sessions', activeSession(DEFAULT_HEARTBEAT_INTERVAL_SECONDS, overrides));

          await heartbeat(payload);

          expect(await queued()).toEqual([]);
          expect(drainSessionRequests).not.toHaveBeenCalled();
          expect((await getCurrentSession())!.checkpointedDuration).toBeUndefined();
        });

        test('no session: nothing to send', async () => {
          await heartbeat();

          expect(await queued()).toEqual([]);
          expect(await getCurrentSession()).toBeNull();
        });

        test('the heartbeat message sends without the session debounce', async () => {
          await db.put('Sessions', activeSession(DEFAULT_HEARTBEAT_INTERVAL_SECONDS));
          const cancel = vi.fn();
          self.cancel = cancel;

          self.dispatchEvent(
            new ExtendableMessageEvent('message', {
              command: WorkerMessengerCommand._SessionHeartbeat,
              payload: {
                ...baseMessagePayload,
                sessionOrigin: SessionOrigin._Heartbeat,
              } satisfies UpsertOrDeactivateSessionPayload,
            }),
          );
          await flush();

          expect(await queued()).toEqual([expect.objectContaining({ kind: 'update' })]);
          expect(cancel).not.toHaveBeenCalled();
        });
      });

      describe('under Identity Verification', () => {
        const JWT = 'header.payload.signature';
        const externalIdUri = `**/apps/${appId}/users/by/external_id/${EXTERNAL_ID}`;

        const upsertWith = (user: Partial<UpsertOrDeactivateSessionPayload>) =>
          dispatchEvent(
            new ExtendableMessageEvent('message', {
              command: WorkerMessengerCommand._SessionUpsert,
              payload: {
                ...baseMessagePayload,
                isSafari: false,
                ...user,
              } satisfies UpsertOrDeactivateSessionPayload,
            }),
          );

        test('addresses the user by external_id with the bearer when the payload carries both', async () => {
          getHandler({ uri: externalIdUri, method: 'patch', status: 200, callback: updateUserFn });

          await upsertWith({ jwtRequired: true, externalId: EXTERNAL_ID, jwt: JWT });

          expect(updateUserFn).toHaveBeenCalledExactlyOnceWith({
            refresh_device_metadata: true,
            deltas: { session_count: 1 },
          });
          const [headers, url] = requestHeadersFn.mock.calls.at(-1)!;
          expect(url).toContain(`/users/by/external_id/${EXTERNAL_ID}`);
          expect(headers.authorization).toBe(`Bearer ${JWT}`);
        });

        test('without jwtRequired the request uses onesignal_id even with an externalId', async () => {
          setUpdateUserResponse();

          await upsertWith({ externalId: EXTERNAL_ID });

          expect(updateUserFn).toHaveBeenCalledTimes(1);
          const [headers, url] = requestHeadersFn.mock.calls.at(-1)!;
          expect(url).toContain(`/users/by/onesignal_id/${ONESIGNAL_ID}`);
          expect(headers.authorization).toBeUndefined();
        });

        test('jwtRequired without a jwt: the session is stored as pending and no request is sent', async () => {
          setUpdateUserResponse();
          const putSpy = vi.spyOn(db, 'put');

          await upsertWith({ jwtRequired: true, externalId: EXTERNAL_ID });

          expect(putSpy).toHaveBeenCalledWith(
            'Sessions',
            expect.objectContaining({ status: SessionStatus._Active }),
          );
          expect(Log._debug).toHaveBeenCalledWith(
            '[SW] No JWT under Identity Verification, skipping the session request',
          );
          expect(updateUserFn).not.toHaveBeenCalled();
          expect(requestHeadersFn).not.toHaveBeenCalled();
          expect(await getCurrentSession()).toMatchObject({
            status: SessionStatus._Active,
            onSessionPendingFor: EXTERNAL_ID,
          });
        });

        test('a later upsert with a jwt sends the pending on_session once', async () => {
          getHandler({ uri: externalIdUri, method: 'patch', status: 200, callback: updateUserFn });

          await upsertWith({ jwtRequired: true, externalId: EXTERNAL_ID });
          // Still no token: the session stays pending.
          await upsertWith({ jwtRequired: true, externalId: EXTERNAL_ID });
          expect(updateUserFn).not.toHaveBeenCalled();
          expect(await getCurrentSession()).toMatchObject({ onSessionPendingFor: EXTERNAL_ID });

          await upsertWith({
            jwtRequired: true,
            externalId: EXTERNAL_ID,
            jwt: JWT,
            sessionOrigin: SessionOrigin._JwtUpdated,
          });
          expect(updateUserFn).toHaveBeenCalledExactlyOnceWith({
            refresh_device_metadata: true,
            deltas: { session_count: 1 },
          });
          const [headers, url] = requestHeadersFn.mock.calls.at(-1)!;
          expect(url).toContain(`/users/by/external_id/${EXTERNAL_ID}`);
          expect(headers.authorization).toBe(`Bearer ${JWT}`);
          const afterSend = await getCurrentSession();
          expect(afterSend).toMatchObject({ status: SessionStatus._Active });
          expect(afterSend!.onSessionPendingFor).toBeUndefined();

          // The session is active and no longer pending, so a focus upsert sends nothing.
          await upsertWith({
            jwtRequired: true,
            externalId: EXTERNAL_ID,
            jwt: JWT,
            sessionOrigin: SessionOrigin._Focus,
          });
          expect(updateUserFn).toHaveBeenCalledTimes(1);
        });

        test('a pending session reactivated within the threshold sends on_session with the jwt', async () => {
          getHandler({ uri: externalIdUri, method: 'patch', status: 200, callback: updateUserFn });
          await db.put('Sessions', {
            ...session,
            status: SessionStatus._Inactive,
            lastDeactivatedTimestamp: Date.now(),
            onSessionPendingFor: EXTERNAL_ID,
          });

          await upsertWith({ jwtRequired: true, externalId: EXTERNAL_ID, jwt: JWT });

          expect(updateUserFn).toHaveBeenCalledTimes(1);
          const current = await getCurrentSession();
          expect(current).toMatchObject({ status: SessionStatus._Active });
          expect(current!.onSessionPendingFor).toBeUndefined();
        });

        // An anonymous user has no backend user under IV, so no token can complete this request later.
        test('an anonymous user does not leave the session pending', async () => {
          setUpdateUserResponse();

          await upsertWith({ jwtRequired: true });

          expect(updateUserFn).not.toHaveBeenCalled();
          const current = await getCurrentSession();
          expect(current).toMatchObject({ status: SessionStatus._Active });
          expect(current!.onSessionPendingFor).toBeUndefined();
        });

        test('a 401 leaves the session pending and the next token sends on_session once', async () => {
          server.use(
            http.patch(externalIdUri, async ({ request }) => {
              requestHeadersFn(Object.fromEntries(request.headers), request.url);
              updateUserFn(await request.json());
              const rejected = request.headers.get('authorization') === `Bearer ${JWT}`;
              return HttpResponse.json({}, { status: rejected ? 401 : 200 });
            }),
          );

          await upsertWith({ jwtRequired: true, externalId: EXTERNAL_ID, jwt: JWT });
          expect(updateUserFn).toHaveBeenCalledTimes(1);
          expect(await getCurrentSession()).toMatchObject({
            status: SessionStatus._Active,
            onSessionPendingFor: EXTERNAL_ID,
          });

          await upsertWith({
            jwtRequired: true,
            externalId: EXTERNAL_ID,
            jwt: 'fresh.jwt.value',
            sessionOrigin: SessionOrigin._JwtUpdated,
          });
          expect(updateUserFn).toHaveBeenCalledTimes(2);
          expect(requestHeadersFn.mock.calls.at(-1)![0].authorization).toBe(
            'Bearer fresh.jwt.value',
          );
          expect((await getCurrentSession())!.onSessionPendingFor).toBeUndefined();

          await upsertWith({ jwtRequired: true, externalId: EXTERNAL_ID, jwt: 'fresh.jwt.value' });
          expect(updateUserFn).toHaveBeenCalledTimes(2);
        });

        test('a request that does not reach the server leaves the session pending', async () => {
          server.use(http.patch(externalIdUri, () => HttpResponse.error()));

          await upsertWith({ jwtRequired: true, externalId: EXTERNAL_ID, jwt: JWT });

          // Every retry fails, so the request gives up.
          await expect
            .poll(async () => (await getCurrentSession())?.onSessionPendingFor)
            .toBe(EXTERNAL_ID);
          expect(await getCurrentSession()).toMatchObject({ status: SessionStatus._Active });
        });

        // The retries can outlast the session threshold, so the row the request
        // started with may be gone by the time the request gives up.
        test('a session finalized while the request retries is not recreated', async () => {
          let finalized!: () => void;
          const finalizedPromise = new Promise<void>((resolve) => (finalized = resolve));
          server.use(
            http.patch(externalIdUri, async () => {
              await finalizedPromise;
              return HttpResponse.error();
            }),
          );
          const user = {
            ...baseMessagePayload,
            jwtRequired: true,
            externalId: EXTERNAL_ID,
            jwt: JWT,
          };

          const upsert = upsertSession(user);
          await vi.waitUntil(async () => (await getCurrentSession()) !== null, { interval: 1 });
          await db.delete('Sessions', ONESIGNAL_SESSION_KEY);
          finalized();
          await upsert;

          expect(await getCurrentSession()).toBeNull();
        });

        test('a pending restore after a failed retry goes on the current session only', async () => {
          let replaced!: () => void;
          const replacedPromise = new Promise<void>((resolve) => (replaced = resolve));
          server.use(
            http.patch(externalIdUri, async () => {
              await replacedPromise;
              return HttpResponse.error();
            }),
          );
          await db.put('Sessions', { ...session, onSessionPendingFor: EXTERNAL_ID });
          const user = {
            ...baseMessagePayload,
            jwtRequired: true,
            externalId: EXTERNAL_ID,
            jwt: JWT,
          };

          const upsert = upsertSession(user);
          await vi.waitUntil(
            async () => (await getCurrentSession())?.onSessionPendingFor === undefined,
            { interval: 1 },
          );
          const replacement = { ...session, startTimestamp: session.startTimestamp + 1 };
          await db.put('Sessions', replacement);
          replaced();
          await upsert;

          expect(await getCurrentSession()).toEqual(replacement);
        });

        test('a 4xx other than 401 counts as sent', async () => {
          getHandler({ uri: externalIdUri, method: 'patch', status: 400, callback: updateUserFn });

          await upsertWith({ jwtRequired: true, externalId: EXTERNAL_ID, jwt: JWT });

          expect(updateUserFn).toHaveBeenCalledTimes(1);
          expect((await getCurrentSession())!.onSessionPendingFor).toBeUndefined();
        });

        test('the pending on_session is not sent to a different user', async () => {
          getHandler({ uri: externalIdUri, method: 'patch', status: 200, callback: updateUserFn });
          getHandler({
            uri: `**/apps/${appId}/users/by/external_id/someone-else`,
            method: 'patch',
            status: 200,
            callback: updateUserFn,
          });
          await upsertWith({ jwtRequired: true, externalId: EXTERNAL_ID });
          expect(await getCurrentSession()).toMatchObject({ onSessionPendingFor: EXTERNAL_ID });

          await upsertWith({ jwtRequired: true, externalId: 'someone-else', jwt: JWT });

          expect(updateUserFn).not.toHaveBeenCalled();
          expect((await getCurrentSession())!.onSessionPendingFor).toBeUndefined();
        });

        // The debounce only cancels a refresh that has not started, so a request
        // slower than the debounce can overlap the next upsert.
        test('two overlapping upserts send the pending on_session once', async () => {
          server.use(
            http.patch(externalIdUri, async ({ request }) => {
              updateUserFn(await request.json());
              await new Promise((resolve) => setTimeout(resolve, 50));
              return HttpResponse.json({});
            }),
          );
          await db.put('Sessions', { ...session, onSessionPendingFor: EXTERNAL_ID });
          const user = {
            ...baseMessagePayload,
            jwtRequired: true,
            externalId: EXTERNAL_ID,
            jwt: JWT,
          };

          const first = upsertSession(user);
          await vi.waitUntil(() => updateUserFn.mock.calls.length === 1, { interval: 1 });
          await upsertSession(user);
          await first;

          expect(updateUserFn).toHaveBeenCalledTimes(1);
          expect((await getCurrentSession())!.onSessionPendingFor).toBeUndefined();
        });

        test.each([200, 401])(
          'the jwt never reaches a log line of any level (status %i)',
          async (status) => {
            const logSpies = (['_debug', '_info', '_warn', '_error'] as const).map((level) =>
              vi.spyOn(Log, level).mockImplementation(() => {}),
            );
            getHandler({ uri: externalIdUri, method: 'patch', status, callback: updateUserFn });

            await upsertWith({ jwtRequired: true, externalId: EXTERNAL_ID, jwt: JWT });

            expect(Log._debug).toHaveBeenCalledWith(
              '[SW] debounceRefresh',
              expect.objectContaining({ jwt: '[redacted]' }),
            );
            const loggedText = logSpies
              .flatMap((spy) => spy.mock.calls)
              .map((args) => JSON.stringify(args))
              .join('\n');
            expect(loggedText).not.toContain(JWT);
          },
        );

        test('a 401 on a signed request logs an error and tells the pages which token was rejected', async () => {
          const errorSpy = vi.spyOn(Log, '_error').mockImplementation(() => {});
          getHandler({ uri: externalIdUri, method: 'patch', status: 401 });

          await upsertWith({ jwtRequired: true, externalId: EXTERNAL_ID, jwt: JWT });

          expect(errorSpy).toHaveBeenCalledWith(
            '[SW] The server rejected the JWT on the session request (401)',
          );
          expect(postMessageFn).toHaveBeenCalledExactlyOnceWith({
            command: WorkerMessengerCommand._JwtUnauthorized,
            payload: { externalId: EXTERNAL_ID, jwt: JWT },
          });
        });

        // The broadcast runs inside the promise the event holds open, so the
        // browser does not stop the worker before postMessage.
        test('the session request does not settle before the pages get the 401 report', async () => {
          vi.spyOn(Log, '_error').mockImplementation(() => {});
          getHandler({ uri: externalIdUri, method: 'patch', status: 401 });
          matchAllFn.mockImplementationOnce(
            () => new Promise((resolve) => setTimeout(() => resolve([mockClient]), 30)),
          );

          const sent = await updateUserSession({
            appId,
            onesignalId: ONESIGNAL_ID,
            subscriptionId: SUB_ID,
            jwtRequired: true,
            externalId: EXTERNAL_ID,
            jwt: JWT,
          });

          expect(sent).toBe(false);
          expect(postMessageFn).toHaveBeenCalledExactlyOnceWith({
            command: WorkerMessengerCommand._JwtUnauthorized,
            payload: { externalId: EXTERNAL_ID, jwt: JWT },
          });
        });

        describe('the 401 report goes to one tab only', () => {
          const focusedTab = () => new Client({ url: 'http://focused-tab.com' });
          const visibleTab = () =>
            new Client({
              url: 'http://visible-tab.com',
              focused: false,
              visibilityState: 'visible',
            });
          const hiddenTab = (url = 'http://hidden-tab.com') =>
            new Client({ url, focused: false, visibilityState: 'hidden' });

          // Returns the postMessage spy of each tab, in the order given.
          const reportTo = async (tabs: Client[]) => {
            vi.spyOn(Log, '_error').mockImplementation(() => {});
            getHandler({ uri: externalIdUri, method: 'patch', status: 401 });
            const spies = tabs.map((tab) => vi.spyOn(tab, 'postMessage'));
            // The first list goes to the focus check in refreshSession, the second to the report.
            matchAllFn.mockResolvedValueOnce([mockClient]).mockResolvedValueOnce(tabs);
            await upsertWith({ jwtRequired: true, externalId: EXTERNAL_ID, jwt: JWT });
            return spies;
          };
          const report = {
            command: WorkerMessengerCommand._JwtUnauthorized,
            payload: { externalId: EXTERNAL_ID, jwt: JWT },
          };

          test('the focused tab gets it before a visible or a hidden tab', async () => {
            const [hidden, visible, focused] = await reportTo([
              hiddenTab(),
              visibleTab(),
              focusedTab(),
            ]);
            expect(focused).toHaveBeenCalledExactlyOnceWith(report);
            expect(visible).not.toHaveBeenCalled();
            expect(hidden).not.toHaveBeenCalled();
          });

          test('with no focused tab, a visible tab gets it', async () => {
            const [hidden, visible] = await reportTo([hiddenTab(), visibleTab()]);
            expect(visible).toHaveBeenCalledExactlyOnceWith(report);
            expect(hidden).not.toHaveBeenCalled();
          });

          test('with only hidden tabs, the first tab gets it', async () => {
            const [first, second] = await reportTo([
              hiddenTab('http://hidden-1.com'),
              hiddenTab('http://hidden-2.com'),
            ]);
            expect(first).toHaveBeenCalledExactlyOnceWith(report);
            expect(second).not.toHaveBeenCalled();
          });

          test('if the chosen tab throws on postMessage, the next tab gets it', async () => {
            const closing = focusedTab();
            vi.spyOn(closing, 'postMessage').mockImplementation(() => {
              throw new DOMException('closing', 'InvalidStateError');
            });
            const [closingSpy, hidden] = await reportTo([closing, hiddenTab()]);
            expect(closingSpy).toHaveBeenCalledOnce();
            expect(hidden).toHaveBeenCalledExactlyOnceWith(report);
          });
        });

        test('a matchAll rejection on the duration path does not skip the outcome', async () => {
          vi.spyOn(Log, '_error').mockImplementation(() => {});
          getHandler({ uri: externalIdUri, method: 'patch', status: 401 });
          const outcomeFn = vi.fn();
          getHandler({
            uri: `**/outcomes/measure`,
            method: 'post',
            status: 200,
            callback: outcomeFn,
          });
          // The first list goes to the focus check, then the broadcast's matchAll rejects.
          matchAllFn
            .mockResolvedValueOnce([unfocusedClient])
            .mockRejectedValueOnce(new DOMException('gone', 'InvalidStateError'));
          await db.put('Sessions', { ...session, status: SessionStatus._Inactive });
          await putNotificationClickedForOutcomes(appId, clickOutcome);

          await dispatchEvent(
            new ExtendableMessageEvent('message', {
              command: WorkerMessengerCommand._SessionDeactivate,
              payload: {
                ...baseMessagePayload,
                isSafari: false,
                jwtRequired: true,
                externalId: EXTERNAL_ID,
                jwt: JWT,
              } satisfies UpsertOrDeactivateSessionPayload,
            }),
          );

          expect(postMessageFn).not.toHaveBeenCalled();
          expect(outcomeFn).toHaveBeenCalledOnce();
        });

        test('a 200 on a signed request and a 401 on an unsigned request send nothing to the pages', async () => {
          getHandler({ uri: externalIdUri, method: 'patch', status: 200 });
          await upsertWith({ jwtRequired: true, externalId: EXTERNAL_ID, jwt: JWT });

          await db.delete('Sessions', ONESIGNAL_SESSION_KEY);
          getHandler({
            uri: `**/apps/${appId}/users/by/onesignal_id/${ONESIGNAL_ID}`,
            method: 'patch',
            status: 401,
          });
          await upsertWith({ externalId: EXTERNAL_ID });

          expect(postMessageFn).not.toHaveBeenCalledWith(
            expect.objectContaining({ command: WorkerMessengerCommand._JwtUnauthorized }),
          );
        });

        test('a 401 on the signed session duration update also tells the pages', async () => {
          vi.spyOn(Log, '_error').mockImplementation(() => {});
          getHandler({ uri: externalIdUri, method: 'patch', status: 401 });
          matchAllFn.mockResolvedValueOnce([unfocusedClient]);
          await db.put('Sessions', { ...session, status: SessionStatus._Inactive });

          await dispatchEvent(
            new ExtendableMessageEvent('message', {
              command: WorkerMessengerCommand._SessionDeactivate,
              payload: {
                ...baseMessagePayload,
                isSafari: false,
                jwtRequired: true,
                externalId: EXTERNAL_ID,
                jwt: JWT,
              } satisfies UpsertOrDeactivateSessionPayload,
            }),
          );

          expect(postMessageFn).toHaveBeenCalledExactlyOnceWith({
            command: WorkerMessengerCommand._JwtUnauthorized,
            payload: { externalId: EXTERNAL_ID, jwt: JWT },
          });
        });

        test('the session duration update is signed and the outcome stays unsigned', async () => {
          getHandler({ uri: externalIdUri, method: 'patch', status: 200, callback: updateUserFn });
          getHandler({ uri: `**/outcomes/measure`, method: 'post', status: 200 });
          matchAllFn.mockResolvedValueOnce([unfocusedClient]);
          await db.put('Sessions', { ...session, status: SessionStatus._Inactive });
          await putNotificationClickedForOutcomes(appId, clickOutcome);

          await dispatchEvent(
            new ExtendableMessageEvent('message', {
              command: WorkerMessengerCommand._SessionDeactivate,
              payload: {
                ...baseMessagePayload,
                isSafari: false,
                jwtRequired: true,
                externalId: EXTERNAL_ID,
                jwt: JWT,
              } satisfies UpsertOrDeactivateSessionPayload,
            }),
          );

          const requests = requestHeadersFn.mock.calls.map(([headers, url]) => ({
            url,
            authorization: headers.authorization,
          }));
          expect(requests).toEqual([
            {
              url: expect.stringContaining(`/users/by/external_id/${EXTERNAL_ID}`),
              authorization: `Bearer ${JWT}`,
            },
            { url: expect.stringContaining('/outcomes/measure'), authorization: undefined },
          ]);
        });
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

        expect(Log._debug).toHaveBeenCalledWith('No active session to deactivate');
      });

      test('with multiple active sessions', async () => {
        server.use(
          http.patch(`**/apps/${appId}/users/by/*/*`, () => HttpResponse.json({})),
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
        self.dispatchEvent(event);
        self.dispatchEvent(event);

        await flush();

        // should finalize session then clean up sessions
        const s = await getCurrentSession();
        expect(s).toBeNull();

        const notificationClicked = await getAllNotificationClickedForOutcomes();

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
      defaultIconUrl: null,
      vapidPublicKey: '1234567890',
      jwtRequired: JwtRequirement._NotRequired,
      userConfig: TestContext.getFakeAppUserConfig(),
      heartbeatInterval: DEFAULT_HEARTBEAT_INTERVAL_SECONDS,
    };
    const serializedSubscription = {
      createdAt: null,
      deviceId: DEFAULT_DEVICE_ID,
      expirationTime: null,
      optedOut: false,
      subscriptionToken: endpoint + '/',
    };

    beforeEach(() => {
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
      expect(self.shouldLog).toBe(false);
    });

    test('should display notification via DisplayNotification command', async () => {
      const showNotificationSpy = vi.spyOn(self.registration, 'showNotification');

      const notification = {
        notificationId: 'display-test-id',
        title: 'Display Test',
        body: 'Test body',
        confirmDelivery: false,
      };

      const event = new ExtendableMessageEvent('message', {
        command: WorkerMessengerCommand._DisplayNotification,
        payload: { notification },
      });
      await dispatchEvent(event);

      expect(showNotificationSpy).toHaveBeenCalledWith(
        notification.title,
        expect.objectContaining({
          body: notification.body,
        }),
      );
    });

    test('a DisplayNotification message keeps the worker alive until the notification shows', async () => {
      const showNotificationSpy = vi.spyOn(self.registration, 'showNotification');
      const event = new ExtendableMessageEvent('message', {
        command: WorkerMessengerCommand._DisplayNotification,
        payload: {
          notification: { notificationId: 'wait-id', title: 'Wait', confirmDelivery: false },
        },
      });
      const waitUntil = vi.spyOn(event, 'waitUntil');

      self.dispatchEvent(event);

      expect(waitUntil).toHaveBeenCalledOnce();
      expect(showNotificationSpy).not.toHaveBeenCalled();
      await waitUntil.mock.calls[0][0];
      expect(showNotificationSpy).toHaveBeenCalledOnce();
    });
  });
});

const logDebugSpy = vi.spyOn(Log, '_debug');

// @ts-expect-error - for mocking
const apiPutSpy = vi.spyOn(OneSignalApiBase, 'put').mockResolvedValue({
  result: {},
  status: 200,
});

const mockSender = {
  willDisplay: vi.fn(),
  dismiss: vi.fn(),
  click: vi.fn(),
};
vi.mock('src/sw/webhooks/notifications/OSWebhookNotificationEventSender', () => ({
  OSWebhookNotificationEventSender: class {
    willDisplay = mockSender.willDisplay;
    dismiss = mockSender.dismiss;
    click = mockSender.click;
  },
}));

const pushSubscriptionId = '1234';
vi.mock('./helpers', () => ({
  getPushSubscriptionIdByToken: vi.fn().mockImplementation(() => pushSubscriptionId),
}));

vi.mock('../../../src/shared/utils/AwaitableTimeout', () => ({
  awaitableTimeout: vi.fn().mockResolvedValue(undefined),
}));

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
const getSubscriptionMock = vi.fn<() => Promise<PushSubscription | null>>().mockResolvedValue({
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
  }: {
    focused?: boolean;
    url?: string;
    visibilityState?: 'visible' | 'hidden';
  } = {}) {
    this.focused = focused;
    this.url = url;
    this.visibilityState = visibilityState;
  }

  postMessage(message: any) {
    postMessageFn(message);
  }
}
const mockClient = new Client();
const unfocusedClient = new Client({
  focused: false,
  visibilityState: 'hidden',
});
const matchAllFn = vi.fn().mockResolvedValue([mockClient]);
const claimFn = vi.fn();
const openWindowFn = vi.fn();

Object.defineProperty(self, 'clients', {
  value: {
    claim: claimFn,
    matchAll: matchAllFn,
    openWindow: openWindowFn,
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
