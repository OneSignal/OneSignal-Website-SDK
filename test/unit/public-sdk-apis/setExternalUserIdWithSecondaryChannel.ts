import test from "ava";
import nock from "nock";
import Database from "../../../src/services/Database";
import { TestEnvironment } from "../../support/sdk/TestEnvironment";
import Random from "../../support/tester/Random";

test.beforeEach(async _t => {
  await TestEnvironment.initialize();
  TestEnvironment.mockInternalOneSignal();
  await Database.put('Ids', { type: 'appId', id: OneSignal.context.appConfig.appId });
});

test("setExternalUserId after email, makes PUT call to update Email record", async t => {
  const emailPlayerId = Random.getRandomUuid();
  // 1. Nock out email create
  let lastRequestBody: any;
  const nockScopePostPlayer =
    nock('https://onesignal.com')
    .post(`/api/v1/players`)
    .reply(200, (_uri: string, requestBody: any) => {
      lastRequestBody = requestBody;
      return { success : true, id: emailPlayerId };
    });

  await OneSignal.setEmail("test@test.com");
  t.true(nockScopePostPlayer.isDone());

  // 2. Create a push player id in the DB
  const pushPlayerId = Random.getRandomUuid();
  const subscription = await Database.getSubscription();
  subscription.deviceId = pushPlayerId;
  await Database.setSubscription(subscription);

  // 3. Nock out push player set external user id, ignore it
  nock('https://onesignal.com')
   .put(`/api/v1/players/${pushPlayerId}`)
   .reply(200, (_uri: string, _requestBody: any) => {
     return { success : true };
  });

  // 4. Call OneSignal.setExternalUserId and ensure email is updated
  let lastEmailPutRequestBody: any;
  nock('https://onesignal.com')
   .put(`/api/v1/players/${emailPlayerId}`)
   .reply(200, (_uri: string, requestBody: any) => {
     lastEmailPutRequestBody = JSON.parse(requestBody);
     return { success : true };
   });
  const testExternalUserId = "myExtId";
  await OneSignal.setExternalUserId(testExternalUserId);

  t.deepEqual(
    lastEmailPutRequestBody, {
      app_id: OneSignal.context.appConfig.appId,
      external_user_id: testExternalUserId
    }
  );
});
