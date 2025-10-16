import { BASE_IDENTITY, BASE_SUB, PUSH_TOKEN } from '__test__/constants';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import {
  createUserFn,
  setCreateUserError,
  setCreateUserResponse,
} from '__test__/support/helpers/requests';
import MockNotification from '__test__/support/mocks/MockNotification';
import {
  mockPushManager,
  mockPushSubscription,
  MockServiceWorker,
} from '__test__/support/mocks/MockServiceWorker';
import { server } from '__test__/support/mocks/server';
import { http, HttpResponse } from 'msw';
import { getAppState } from 'src/shared/database/config';
import {
  EmptyArgumentError,
  WrongTypeArgumentError,
} from 'src/shared/errors/common';
import * as Log from 'src/shared/libraries/log';
import * as utils from 'src/shared/utils/utils';
import NotificationsNamespace from './NotificationsNamespace';

beforeEach(async () => {
  TestEnvironment.initialize();
});

afterEach(() => {
  OneSignal.setConsentRequired(false);
});

test('should set the default url', async () => {
  const notifications = new NotificationsNamespace();
  await notifications.setDefaultUrl('https://test.com');

  const appState = await getAppState();
  expect(appState.defaultNotificationUrl).toBe('https://test.com');

  await expect(notifications.setDefaultUrl(undefined)).rejects.toThrow(
    EmptyArgumentError('url'),
  );

  // @ts-expect-error - testing throwing invalid type
  await expect(notifications.setDefaultUrl(1)).rejects.toThrow(
    WrongTypeArgumentError('url'),
  );
});

test('should set the default title', async () => {
  const notifications = new NotificationsNamespace();
  await notifications.setDefaultTitle('My notification title');

  const appState = await getAppState();
  expect(appState.defaultNotificationTitle).toBe('My notification title');

  // @ts-expect-error - testing throwing invalid type
  await expect(notifications.setDefaultTitle(1)).rejects.toThrow(
    WrongTypeArgumentError('title'),
  );

  await expect(notifications.setDefaultTitle(undefined)).rejects.toThrow(
    EmptyArgumentError('title'),
  );
});

const warnSpy = vi.spyOn(Log, 'warn');
describe('Consent Required', () => {
  beforeEach(() => {
    OneSignal.setConsentRequired(true);
    TestEnvironment.initialize();
  });

  test('should not show native prompt if consent is required but not given', async () => {
    const initAndSupportedSpy = vi.spyOn(
      utils,
      'awaitOneSignalInitAndSupported',
    );
    const notifications = new NotificationsNamespace();
    await notifications.requestPermission();
    expect(warnSpy).toHaveBeenCalledWith('Consent required but not given');
    expect(initAndSupportedSpy).not.toHaveBeenCalled();
  });
});

describe('requestPermission', () => {
  beforeEach(() => {
    server.use(http.get('**/OneSignalSDK.sw.js', () => HttpResponse.json({})));
  });

  test('can request permission', async () => {
    setCreateUserResponse();

    MockNotification.permission = 'granted';

    const notifications = new NotificationsNamespace();
    const success = await notifications.requestPermission();

    expect(success).toBe(true);

    await vi.waitUntil(() => createUserFn.mock.calls.length === 1);
    expect(createUserFn).toHaveBeenCalledWith({
      identity: {},
      ...BASE_IDENTITY,
      subscriptions: [
        {
          ...BASE_SUB,
          token: PUSH_TOKEN,
          type: 'ChromePush',
        },
      ],
    });
  });

  test('should expose errors', async () => {
    const debugSpy = vi.spyOn(Log, 'debug').mockImplementation(() => '');
    vi.spyOn(Log, 'error').mockImplementation(() => '');

    MockNotification.permission = 'denied';
    const notifications = new NotificationsNamespace();

    // in flight error
    notifications.requestPermission();
    await expect(notifications.requestPermission()).resolves.toBe(false);
    expect(debugSpy).toHaveBeenCalledWith(
      'Already showing autoprompt. Abort showing a native prompt.',
    );

    // permission is denied
    await expect(notifications.requestPermission()).resolves.toBe(false);

    // get subscription error
    MockNotification.permission = 'granted';
    let error = new Error('Get subscription error');
    mockPushManager.getSubscription.mockRejectedValueOnce(error);
    await expect(notifications.requestPermission()).resolves.toBe(false);

    error = new Error('Subscribe error');
    mockPushManager.subscribe.mockRejectedValue(error);
    await expect(notifications.requestPermission()).resolves.toBe(false);

    // create user error
    mockPushManager.subscribe.mockResolvedValue(mockPushSubscription);
    setCreateUserError({ status: 400 });
    await expect(notifications.requestPermission()).resolves.toBe(false);
  });
});

Object.defineProperty(global.navigator, 'serviceWorker', {
  value: new MockServiceWorker(),
  writable: true,
});
