import "../../support/polyfills/polyfills";
import test, { ExecutionContext } from "ava";
import Database from '../../../src/services/Database';
import { TestEnvironment } from "../../support/sdk/TestEnvironment";
import OneSignal from "../../../src/OneSignal";
import { Subscription } from '../../../src/models/Subscription';

import nock from 'nock';
import Random from "../../support/tester/Random";


interface LogoutEmailTestData {
  existingPushDeviceId: string | null;
  emailDeviceId: string;
  identifierAuthHash: string;
}

async function logoutEmailTest(
  t: ExecutionContext,
  testData: LogoutEmailTestData
) {
  await TestEnvironment.initialize();
  TestEnvironment.mockInternalOneSignal();
  await Database.put('Ids', { type: 'appId', id: OneSignal.context.appConfig.appId });

  /* If an existing email device ID is set, create a fake one here */
  if (testData.emailDeviceId) {
    const emailProfile = await Database.getEmailProfile();
    emailProfile.playerId = testData.emailDeviceId;
    await Database.setEmailProfile(emailProfile);
  }

  /* If test data has an email auth has, fake the auth hash */
  if (testData.identifierAuthHash) {
    const emailProfile = await Database.getEmailProfile();
    emailProfile.identifierAuthHash = testData.identifierAuthHash;
    await Database.setEmailProfile(emailProfile);
  }

  /* If an existing push device ID is set, create a fake one here */
  if (testData.existingPushDeviceId) {
    const subscription = new Subscription();
    subscription.deviceId = testData.existingPushDeviceId;
    await Database.setSubscription(subscription);
  }

  expectEmailLogoutRequest(
    t,
    testData.existingPushDeviceId,
    testData.emailDeviceId,
    testData.identifierAuthHash,
    Random.getRandomUuid(),
  );

  await OneSignal.logoutEmail();
}

async function expectEmailLogoutRequest(
  t: ExecutionContext,
  pushDevicePlayerId: string | null,
  emailId: string,
  identifierAuthHash: string,
  newUpdatedPlayerId: string
) {
  nock('https://onesignal.com')
    .post(`/api/v1/players/${pushDevicePlayerId ? pushDevicePlayerId : 'fake'}/email_logout`)
    .reply(200, (_uri: string, requestBody: any) => {
      t.deepEqual(
        requestBody,
        JSON.stringify({
          app_id: OneSignal.context.appConfig.appId,
          parent_player_id: emailId ? emailId : undefined,
          identifier_auth_hash: identifierAuthHash ? identifierAuthHash : undefined
        })
      );
      return { "success":true, "id": newUpdatedPlayerId };
    });
}

test("logoutEmail returns if not subscribed to web push", async t => {
  const testData = {
    existingPushDeviceId: null,
    emailDeviceId: Random.getRandomUuid(),
    identifierAuthHash: "b812f8616dff8ee2c7a4b308ef16e2da36928cfa80249f7c61d36d43f0a521e7",
  }

  await logoutEmailTest(t, testData);

  // Confirm email details have not been erased
  const emailProfile = await Database.getEmailProfile();
  t.deepEqual(emailProfile.playerId, testData.emailDeviceId);
  t.deepEqual(emailProfile.identifierAuthHash, testData.identifierAuthHash);
});

test("logoutEmail calls POST email_logout and clears local data", async t => {
  const testData = {
    existingPushDeviceId: Random.getRandomUuid(),
    emailDeviceId: Random.getRandomUuid(),
    identifierAuthHash: "b812f8616dff8ee2c7a4b308ef16e2da36928cfa80249f7c61d36d43f0a521e7",
  }
  await logoutEmailTest(t, testData);

  // Confirm email details have been erased
  const { deviceId: finalPushDeviceId } = await Database.getSubscription();
  const finalEmailProfile = await Database.getEmailProfile();
  t.deepEqual(finalPushDeviceId, testData.existingPushDeviceId ? testData.existingPushDeviceId : null);
  t.deepEqual(finalEmailProfile.identifier, undefined);
  t.deepEqual(finalEmailProfile.identifierAuthHash, undefined);
  t.deepEqual(finalEmailProfile.playerId, undefined);
});

