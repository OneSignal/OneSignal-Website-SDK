import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { SubscriptionModel } from 'src/core/models/SubscriptionModel';
import User from 'src/onesignal/User';
import * as pageview from 'src/shared/helpers/pageview';
import { SessionOrigin } from 'src/shared/session/constants';
import { NotificationType } from 'src/shared/subscriptions/constants';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { UpdateManager } from './UpdateManager';

describe('UpdateManager', () => {
  let mgr: UpdateManager;
  beforeEach(() => {
    TestEnvironment.initialize();
    vi.restoreAllMocks();
    mgr = new UpdateManager(OneSignal._context);
  });

  test('_sendPushDeviceRecordUpdate early returns with no user, otherwise calls _sendOnSessionUpdate once', async () => {
    // No user
    delete User._singletonInstance;
    const spy = vi.spyOn(mgr, '_sendOnSessionUpdate').mockResolvedValue();
    await mgr._sendPushDeviceRecordUpdate();
    expect(spy).not.toHaveBeenCalled();

    // With user present and first call triggers onSession
    User._createOrGetInstance();
    await mgr._sendPushDeviceRecordUpdate();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test('_sendOnSessionUpdate flows: already sent, not first page, not registered, skip when unsubscribed, success path sets flag', async () => {
    // Already sent
    mgr['_onSessionSent'] = true;
    await mgr._sendOnSessionUpdate();
    // reset
    mgr['_onSessionSent'] = false;

    // Not first page
    const firstSpy = vi
      .spyOn(pageview, 'isFirstPageView')
      .mockReturnValue(false);
    await mgr._sendOnSessionUpdate();
    firstSpy.mockReturnValue(true);

    // Not registered with OneSignal
    const alreadySpy = vi
      .spyOn(
        OneSignal._context._subscriptionManager,
        '_isAlreadyRegisteredWithOneSignal',
      )
      .mockResolvedValue(false);
    await mgr._sendOnSessionUpdate();

    // Registered but not subscribed and enableOnSession not true -> skip
    alreadySpy.mockResolvedValue(true);
    const pushSub = new SubscriptionModel();
    pushSub._notification_types = 0;
    const pushSpy = vi
      .spyOn(OneSignal._coreDirector, '_getPushSubscriptionModel')
      .mockResolvedValue(pushSub);
    const upsertSpy = vi
      .spyOn(OneSignal._context._sessionManager, '_upsertSession')
      .mockResolvedValue();
    await mgr._sendOnSessionUpdate();
    expect(upsertSpy).not.toHaveBeenCalled();

    // Subscribed path
    pushSub._notification_types = NotificationType._Subscribed;
    pushSub.id = 'sub';
    pushSpy.mockResolvedValue(pushSub);
    await mgr._sendOnSessionUpdate();
    expect(upsertSpy).toHaveBeenCalledWith(SessionOrigin._UserNewSession);
  });
});
