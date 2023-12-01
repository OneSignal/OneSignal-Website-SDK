import test from 'ava';
import { DeliveryPlatformKind } from '../../../src/shared/models/DeliveryPlatformKind';
import { SessionManager } from '../../../src/shared/managers/sessionManager/SessionManager';
import { NotificationPermission } from '../../../src/shared/models/NotificationPermission';
import Database from '../../../src/shared/services/Database';
import { TestEnvironment } from '../../support/sdk/TestEnvironment';
import { NockOneSignalHelper } from '../../support/tester/NockOneSignalHelper';
import { setupFakePlayerId } from '../../support/tester/utils';

let pushPlayerId: string;

test.beforeEach(async (t) => {
  await TestEnvironment.initialize({
    permission: NotificationPermission.Granted,
  });
  TestEnvironment.mockInternalOneSignal();

  await Database.put('Ids', {
    type: 'appId',
    id: OneSignal.context.appConfig.appId,
  });
  pushPlayerId = await setupFakePlayerId();
  OneSignal.context.pageViewManager.incrementPageViewCount();
  OneSignal.config.enableOnSession = true;
});

test('sendOnSessionUpdateFromPage, makes on_session call for existing player', async (t) => {
  const onSessionNockPromise =
    NockOneSignalHelper.nockPlayerOnSession(pushPlayerId);
  const sessionManager = new SessionManager(OneSignal.context);
  await sessionManager.sendOnSessionUpdateFromPage();

  t.deepEqual((await onSessionNockPromise.result).request.body, {
    app_id: OneSignal.config.appId,
    device_model: '',
    device_os: -1,
    device_type: DeliveryPlatformKind.ChromeLike,
    language: 'en',
    notification_types: -2,
    sdk: '1',
    timezone: 0,
    timezone_id: 'UTC',
  });
});
