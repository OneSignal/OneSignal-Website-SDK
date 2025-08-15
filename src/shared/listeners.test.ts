import { DUMMY_PUSH_TOKEN } from '__test__/constants';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { createPushSub } from '__test__/support/environment/TestEnvironmentHelpers';
import { setIsPushEnabled } from '__test__/support/helpers/database';
import {
  getSubscriptionFn,
  MockServiceWorker,
} from '__test__/support/mocks/MockServiceWorker';
import * as eventListeners from 'src/shared/listeners';
import type { MockInstance } from 'vitest';
import { getAppState } from './database/config';
import { setPushToken } from './database/subscription';
import { SubscriptionManagerPage } from './managers/subscription/page';

let emitterSpy: MockInstance;

// dont want to make a call to update notification types
vi.spyOn(
  SubscriptionManagerPage.prototype,
  'updateNotificationTypes',
).mockImplementation(() => Promise.resolve());

beforeEach(async () => {
  await TestEnvironment.initialize();
  emitterSpy = vi.spyOn(OneSignal.emitter, 'on');
});

describe('checkAndTriggerSubscriptionChanged', () => {
  test('should trigger subscription changed', async () => {
    const changeListener = vi.fn();
    OneSignal.User.PushSubscription.addEventListener('change', changeListener);

    // no change
    getSubscriptionFn.mockResolvedValue({
      endpoint: undefined,
    });
    await setIsPushEnabled(false);
    await eventListeners.checkAndTriggerSubscriptionChanged();

    expect(changeListener).not.toHaveBeenCalled();

    // push enabled change
    await setIsPushEnabled(true); // mimic old opt in
    changeListener.mockClear();
    await eventListeners.checkAndTriggerSubscriptionChanged();

    expect(changeListener).toHaveBeenCalledWith({
      current: {
        id: undefined,
        optedIn: false,
        token: undefined,
      },
      previous: {
        id: undefined,
        optedIn: true,
        token: undefined,
      },
    });
    expect(await getAppState()).toMatchObject({
      lastKnownOptedIn: false,
      lastKnownPushEnabled: false,
      lastKnownPushToken: undefined,
      lastKnownPushId: undefined,
    });

    // token change
    getSubscriptionFn.mockResolvedValue({
      endpoint: DUMMY_PUSH_TOKEN,
    });
    await setIsPushEnabled(false);

    changeListener.mockClear();
    await eventListeners.checkAndTriggerSubscriptionChanged();

    expect(changeListener).toHaveBeenCalledWith({
      current: {
        id: undefined,
        optedIn: false,
        token: DUMMY_PUSH_TOKEN,
      },
      previous: {
        id: undefined,
        optedIn: false,
        token: undefined,
      },
    });
    expect(await getAppState()).toMatchObject({
      lastKnownOptedIn: false,
      lastKnownPushEnabled: false,
      lastKnownPushToken: DUMMY_PUSH_TOKEN,
      lastKnownPushId: undefined,
    });

    // id change
    const token = 'some-token';
    const newID = 'some-id';
    const pushModel = createPushSub({
      id: newID,
      token,
    });
    await setPushToken(token);
    OneSignal.coreDirector.subscriptionModelStore.add(pushModel);
    getSubscriptionFn.mockResolvedValue({
      endpoint: token,
    });

    await eventListeners.checkAndTriggerSubscriptionChanged();
    expect(changeListener).toHaveBeenCalledWith({
      current: {
        id: newID,
        optedIn: false,
        token,
      },
      previous: {
        id: undefined,
        optedIn: false,
        token,
      },
    });
    expect(await getAppState()).toMatchObject({
      lastKnownOptedIn: false,
      lastKnownPushEnabled: false,
      lastKnownPushToken: token,
      lastKnownPushId: newID,
    });
  });
});

test('Adding click listener fires internal EventHelper', async () => {
  OneSignal.Notifications.addEventListener('click', () => {});
  expect(emitterSpy).toHaveBeenCalledTimes(1);
});

Object.defineProperty(global.navigator, 'serviceWorker', {
  value: new MockServiceWorker(),
  writable: true,
});

// dont want to make a call to update notification types
vi.spyOn(
  SubscriptionManagerPage.prototype,
  'updateNotificationTypes',
).mockResolvedValue();
