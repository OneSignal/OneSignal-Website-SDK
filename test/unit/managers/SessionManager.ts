import test from "ava";
import { SessionManager } from "../../../src/managers/sessionManager/page/SessionManager";
import { DeliveryPlatformKind } from "../../../src/models/DeliveryPlatformKind";
import { NotificationPermission } from "../../../src/models/NotificationPermission";
import Database from "../../../src/services/Database";
import { HttpHttpsEnvironment, TestEnvironment } from "../../support/sdk/TestEnvironment";
import { NockOneSignalHelper } from "../../support/tester/NockOneSignalHelper";
import { setupFakePlayerId } from "../../support/tester/utils";

let pushPlayerId: string;

test.beforeEach(async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https,
    permission: NotificationPermission.Granted
  });
  TestEnvironment.mockInternalOneSignal();

  await Database.put('Ids', { type: 'appId', id: OneSignal.context.appConfig.appId });
  pushPlayerId = await setupFakePlayerId();
  OneSignal.context.pageViewManager.incrementPageViewCount();
  OneSignal.config.enableOnSession = true;
});

test("sendOnSessionUpdateFromPage, makes on_session call for existing player", async t => {
  const onSessionNockPromise = NockOneSignalHelper.nockPlayerOnSession(pushPlayerId);
  const sessionManager = new SessionManager(OneSignal.context);
  await sessionManager.sendOnSessionUpdateFromPage();

  t.deepEqual(
    (await onSessionNockPromise.result).request.body,
    {
      app_id: OneSignal.config.appId,
      device_model: '',
      device_os: -1,
      device_type: DeliveryPlatformKind.ChromeLike,
      language: 'en',
      notification_types: -2,
      sdk: '1',
      timezone: 0,
      timezone_id: 'UTC',
    }
  );
});

const TEST_EMAIL = "test@test.com";

test("sendOnSessionUpdateFromPage, makes on_session call for existing email player", async t => {
  // 0. Nock out parent_player_id update for push player, ignore it
  // TODO: This is repeated again here. Can we just ignore all player PUT requests to the push player?
  NockOneSignalHelper.nockPlayerPut(pushPlayerId);

  // 1. Nock out email create
  const emailPostNock = NockOneSignalHelper.nockPlayerPost();
  await OneSignal.setEmail(TEST_EMAIL);
  const emailPlayerId = (await emailPostNock.result).response.body.id;

  // 2. Nock out on_session for push player
  NockOneSignalHelper.nockPlayerOnSession(pushPlayerId);

  // 2. Nock out on_session for email player
  const onSessionForEmail = NockOneSignalHelper.nockPlayerOnSession(emailPlayerId);

  const sessionManager = new SessionManager(OneSignal.context);
  await sessionManager.sendOnSessionUpdateFromPage();

  t.is((await onSessionForEmail.result).request.url, `/api/v1/players/${emailPlayerId}/on_session`);
  t.deepEqual(
    (await onSessionForEmail.result).request.body,
    {
      app_id: OneSignal.config.appId,
      device_model: '',
      identifier: TEST_EMAIL,
      device_os: -1,
      device_type: DeliveryPlatformKind.Email,
      language: 'en',
      sdk: '1',
      timezone: 0,
      timezone_id: 'UTC',
    }
  );
});
