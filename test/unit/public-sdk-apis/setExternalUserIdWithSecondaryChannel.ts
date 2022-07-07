import test from "ava";
import Database from "../../../src/shared/services/Database";
import { TestEnvironment } from "../../support/sdk/TestEnvironment";
import { NockOneSignalHelper } from "../../support/tester/NockOneSignalHelper";
import { setupFakePlayerId } from "../../support/tester/utils";

const TEST_EXTERNAL_USER_ID = "myExtId";
const TEST_EMAIL_ADDRESS = "test@test.com";

test.beforeEach(async _t => {
  await TestEnvironment.initialize();
  TestEnvironment.mockInternalOneSignal();
  await Database.put('Ids', { type: 'appId', id: OneSignal.context.appConfig.appId });
});

test("setExternalUserId after email, w/ push player, makes PUT call to update Email record", async t => {
  // 1. Nock out email create
  const emailPostNock = NockOneSignalHelper.nockPlayerPost();
  await OneSignal.setEmail(TEST_EMAIL_ADDRESS);
  const emailPlayerId = (await emailPostNock.result).response.body.id;

  // 2. Create a push player id in the DB
  const pushPlayerId = await setupFakePlayerId();

  // 3. Nock out push player set external user id, ignore it
  NockOneSignalHelper.nockPlayerPut(pushPlayerId);

  // 4. Call OneSignal.setExternalUserId and ensure email is updated
  const externalUserIdUpdateOnEmail = NockOneSignalHelper.nockPlayerPut(emailPlayerId);
  await OneSignal.setExternalUserId(TEST_EXTERNAL_USER_ID);

  t.deepEqual(
    (await externalUserIdUpdateOnEmail.result).request.body,
    {
      app_id: OneSignal.context.appConfig.appId,
      external_user_id: TEST_EXTERNAL_USER_ID
    }
  );
});

test("setExternalUserId before email, makes PUT call to update Email record", async t => {
  // 1. Create a push player id in the DB
  const pushPlayerId = await setupFakePlayerId();

  // 2. Nock out push player set external user id, ignore it
  NockOneSignalHelper.nockPlayerPut(pushPlayerId);

  // 3. Call OneSignal.setExternalUserId
  await OneSignal.setExternalUserId(TEST_EXTERNAL_USER_ID);

  // 4. Nock out parent_player_id update for push player, ignore it
  // TODO: This is repeated again here. Can we just ignore all player PUT requests to the push player?
  NockOneSignalHelper.nockPlayerPut(pushPlayerId);

  // 5. Call OneSignal.setEmail and get the returned playerId from the POST call.
  const emailPostNock = NockOneSignalHelper.nockPlayerPost();
  OneSignal.setEmail(TEST_EMAIL_ADDRESS);
  const emailPlayerId = (await emailPostNock.result).response.body.id;

  // 6. Await for the follow up PUT call to set external_user_id on email, ensure it was sent.
  const emailPutResult = await NockOneSignalHelper.nockPlayerPut(emailPlayerId).result;
  t.is(
    emailPutResult.request.body.external_user_id,
    TEST_EXTERNAL_USER_ID
  );
});

test("setExternalUserId before email, includes external_user_id in POST create call", async t => {
  // 1. Create a push player id in the DB
  const pushPlayerId = await setupFakePlayerId();

  // 2. Nock out push player set external user id, ignore it
  NockOneSignalHelper.nockPlayerPut(pushPlayerId);

  // 3. Call OneSignal.setExternalUserId
  await OneSignal.setExternalUserId(TEST_EXTERNAL_USER_ID);

  // 4. Nock out parent_player_id update for push player, ignore it
  NockOneSignalHelper.nockPlayerPut(pushPlayerId);

  // 5. Call OneSignal.setEmail and get the returned playerId from the POST call.
  const emailPostNock = NockOneSignalHelper.nockPlayerPost();
  const setEmailPromise = OneSignal.setEmail(TEST_EMAIL_ADDRESS);

  t.is(
    (await emailPostNock.result).request.body.external_user_id,
    TEST_EXTERNAL_USER_ID
  );

  // 6. Nock out PUT call for external_user_id on emailId, and wait promise so
  //    we don't have test carry over.
  NockOneSignalHelper.nockPlayerPut((await emailPostNock.result).response.body.id);
  await setEmailPromise;
});

test("setExternalUserId after email, w/o push player, makes PUT call to update Email record", async t => {
  // 1. Nock out email create
  const emailPostNock = NockOneSignalHelper.nockPlayerPost();
  await OneSignal.setEmail(TEST_EMAIL_ADDRESS);
  const emailPlayerId = (await emailPostNock.result).response.body.id;

  // 2. Call OneSignal.setExternalUserId
  const externalUserIdUpdateOnEmail = NockOneSignalHelper.nockPlayerPut(emailPlayerId);
  await OneSignal.setExternalUserId(TEST_EXTERNAL_USER_ID);

  // 3. Ensure we made a PUT call and it includes the external_user_id we just set above.
  t.deepEqual(
    (await externalUserIdUpdateOnEmail.result).request.body,
    {
      app_id: OneSignal.context.appConfig.appId,
      external_user_id: TEST_EXTERNAL_USER_ID
    }
  );
});
