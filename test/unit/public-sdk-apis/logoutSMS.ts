import test from "ava";
import Database from "../../../src/shared/services/Database";
import { TestEnvironment } from "../../support/sdk/TestEnvironment";
import { NockOneSignalHelper } from "../../support/tester/NockOneSignalHelper";
import { setupFakePlayerId } from "../../support/tester/utils";

const TEST_SMS_NUMBER = "+1112223333";

test.beforeEach(async _t => {
  await TestEnvironment.initialize();
  TestEnvironment.mockInternalOneSignal();
  await Database.put('Ids', { type: 'appId', id: OneSignal.context.appConfig.appId });
});

test("logoutSMS, omits future update calls", async t => {
  // 1. Create a push player id in the DB
  const pushPlayerId = await setupFakePlayerId();

  // 2. Nock out SMS create
  NockOneSignalHelper.nockPlayerPost();
  await OneSignal.setSMSNumber(TEST_SMS_NUMBER);

  // 3. Logout email
  await OneSignal.logoutSMS();

  // 4. Try to send tags, ignore sendTag for push player
  NockOneSignalHelper.nockPlayerPut(pushPlayerId);
  await OneSignal.sendTag("key", "value");

  // 5. If nock did not throw due to missing stub then the SMS PUT call was correctly omitted
  t.pass();
});
