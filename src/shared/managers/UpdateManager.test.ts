import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import User from 'src/onesignal/User';
import * as pageview from 'src/shared/helpers/pageview';
import { SessionOrigin } from 'src/shared/session/constants';
import { NotificationType } from 'src/shared/subscriptions/constants';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { UpdateManager } from './UpdateManager';

describe('UpdateManager', () => {
  beforeEach(() => {
    TestEnvironment.initialize();
    vi.restoreAllMocks();
  });

  test('_sendPushDeviceRecordUpdate early returns with no user, otherwise calls _sendOnSessionUpdate once', async () => {
    const mgr = new UpdateManager(OneSignal._context);
    // No user
    User._singletonInstance = undefined;
    const spy = vi.spyOn(mgr, '_sendOnSessionUpdate').mockResolvedValue();
    await mgr._sendPushDeviceRecordUpdate();
    expect(spy).not.toHaveBeenCalled();

    // With user present and first call triggers onSession
    User._singletonInstance = { onesignalId: 'id' };
    await mgr._sendPushDeviceRecordUpdate();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test('_sendOnSessionUpdate flows: already sent, not first page, not registered, skip when unsubscribed, success path sets flag', async () => {
    const mgr = new UpdateManager(OneSignal._context);
    // Already sent
    mgr._onSessionSent = true;
    await mgr._sendOnSessionUpdate();
    // reset
    mgr._onSessionSent = false;

    // Not first page
    vi.spyOn(pageview, 'isFirstPageView').mockReturnValue(false);
    await mgr._sendOnSessionUpdate();
    pageview.isFirstPageView.mockReturnValue(true);

    // Not registered with OneSignal
    vi.spyOn(
      OneSignal._context._subscriptionManager,
      '_isAlreadyRegisteredWithOneSignal',
    ).mockResolvedValue(false);
    await mgr._sendOnSessionUpdate();

    // Registered but not subscribed and enableOnSession not true -> skip
    OneSignal._context._subscriptionManager._isAlreadyRegisteredWithOneSignal.mockResolvedValue(
      true,
    );
    vi.spyOn(
      OneSignal._coreDirector,
      '_getPushSubscriptionModel',
    ).mockResolvedValue({
      _notification_types: 0,
    });
    const upsertSpy = vi
      .spyOn(OneSignal._context._sessionManager, '_upsertSession')
      .mockResolvedValue();
    await mgr._sendOnSessionUpdate();
    expect(upsertSpy).not.toHaveBeenCalled();

    // Subscribed path
    OneSignal._coreDirector._getPushSubscriptionModel.mockResolvedValue({
      _notification_types: NotificationType._Subscribed,
      id: 'sub',
    });
    await mgr._sendOnSessionUpdate();
    expect(upsertSpy).toHaveBeenCalledWith(SessionOrigin._UserNewSession);
  });
});
