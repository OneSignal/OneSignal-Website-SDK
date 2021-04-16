import test from "ava";
import Database from "../../../src/services/Database";
import { TestEnvironment } from "../../support/sdk/TestEnvironment";
import { NockOneSignalHelper } from "../../support/tester/NockOneSignalHelper";
import { setupFakePlayerId } from "../../support/tester/utils";

test.beforeEach(async _t => {
  await TestEnvironment.initialize();
  TestEnvironment.mockInternalOneSignal();
  await Database.put('Ids', { type: 'appId', id: OneSignal.context.appConfig.appId });
});

test("setExternalUserId after email, makes PUT call to update Email record", async t => {
  // 1. Nock out email create
  const emailPostNock = NockOneSignalHelper.nockPlayerPost();
  await OneSignal.setEmail("test@test.com");
  const emailPlayerId = (await emailPostNock.result).response.body.id;

  // 2. Create a push player id in the DB
  const pushPlayerId = await setupFakePlayerId();

  // 3. Nock out push player set external user id, ignore it
  NockOneSignalHelper.nockPlayerPut(pushPlayerId);

  // 4. Call OneSignal.setExternalUserId and ensure email is updated
  const externalUserIdUpdateOnEmail = NockOneSignalHelper.nockPlayerPut(emailPlayerId);
  const testExternalUserId = "myExtId";
  await OneSignal.setExternalUserId(testExternalUserId);

  t.deepEqual(
    (await externalUserIdUpdateOnEmail.result).request.body, {
      app_id: OneSignal.context.appConfig.appId,
      external_user_id: testExternalUserId
    }
  );
});
