import test from "ava";
import Database from "../../../src/services/Database";
import { TestEnvironment } from "../../support/sdk/TestEnvironment";
import { NockOneSignalHelper } from "../../support/tester/NockOneSignalHelper";
import { setupFakePlayerId } from "../../support/tester/utils";

const TEST_TAGS = { key: "value" };
const TEST_EMAIL_ADDRESS = "test@test.com";

test.beforeEach(async _t => {
  await TestEnvironment.initialize();
  TestEnvironment.mockInternalOneSignal();
  await Database.put('Ids', { type: 'appId', id: OneSignal.context.appConfig.appId });
});

test("sendTags after email, makes PUT call to update Email record", async t => {
  // 1. Nock out email create
  const emailPostNock = NockOneSignalHelper.nockPlayerPost();
  await OneSignal.setEmail(TEST_EMAIL_ADDRESS);
  const emailPlayerId = (await emailPostNock.result).response.body.id;

  // 2. Create a push player id in the DB
  const pushPlayerId = await setupFakePlayerId();

  // 3. Nock out push player setting tags, ignore it
  NockOneSignalHelper.nockPlayerPut(pushPlayerId);

  // 4. Call OneSignal.sendTags and ensure email is updated
  const tagsUpdateOnEmail = NockOneSignalHelper.nockPlayerPut(emailPlayerId);
  await OneSignal.sendTags(TEST_TAGS);

  t.deepEqual(
    (await tagsUpdateOnEmail.result).request.body,
    {
      app_id: OneSignal.context.appConfig.appId,
      tags: TEST_TAGS
    }
  );
});

test("sendTags before email, makes PUT call to update Email record", async t => {
  // 1. Create a push player id in the DB
  const pushPlayerId = await setupFakePlayerId();

  // 2. Nock out push player tag setting, ignore it
  NockOneSignalHelper.nockPlayerPut(pushPlayerId);

  // 3. Call OneSignal.sendTags
  OneSignal.sendTags(TEST_TAGS);

  // 4. Nock out parent_player_id update for push player, ignore it
  // TODO: This is repeated again here. Can we just ignore all player PUT requests to the push player?
  NockOneSignalHelper.nockPlayerPut(pushPlayerId);

  // 5. Call OneSignal.setEmail and get the returned playerId from the POST call.
  const emailPostNock = NockOneSignalHelper.nockPlayerPost();
  OneSignal.setEmail(TEST_EMAIL_ADDRESS);
  const emailPlayerId = (await emailPostNock.result).response.body.id;

  // 6. Await for the follow up PUT call to set tags on email, ensure it was sent.
  const emailPutResult = await NockOneSignalHelper.nockPlayerPut(emailPlayerId).result;
  t.deepEqual(
    emailPutResult.request.body.tags,
    TEST_TAGS
  );
});

