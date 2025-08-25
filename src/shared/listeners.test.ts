import { PUSH_TOKEN } from '__test__/constants';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { createPushSub } from '__test__/support/environment/TestEnvironmentHelpers';
import { setIsPushEnabled } from '__test__/support/helpers/setup';
import {
  getSubscriptionFn,
  MockServiceWorker,
} from '__test__/support/mocks/MockServiceWorker';
import * as eventListeners from 'src/shared/listeners';
import { getAppState } from './database/config';
import { setPushToken } from './database/subscription';
import { SubscriptionManagerPage } from './managers/subscription/page';

vi.useFakeTimers();

beforeEach(() => {
  TestEnvironment.initialize();
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
      endpoint: PUSH_TOKEN,
    });
    await setIsPushEnabled(false);

    changeListener.mockClear();
    await eventListeners.checkAndTriggerSubscriptionChanged();

    expect(changeListener).toHaveBeenCalledWith({
      current: {
        id: undefined,
        optedIn: false,
        token: PUSH_TOKEN,
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
      lastKnownPushToken: PUSH_TOKEN,
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

Object.defineProperty(global.navigator, 'serviceWorker', {
  value: new MockServiceWorker(),
  writable: true,
});

// dont want to make a call to update notification types
vi.spyOn(
  SubscriptionManagerPage.prototype,
  'updateNotificationTypes',
).mockResolvedValue();
