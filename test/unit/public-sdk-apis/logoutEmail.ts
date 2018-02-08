import "../../support/polyfills/polyfills";
import test, { TestContext, Context } from "ava";
import Database from '../../../src/services/Database';
import Macros from "../../support/tester/Macros";
import {TestEnvironment} from "../../support/sdk/TestEnvironment";
import OneSignal from "../../../src/OneSignal";
import { Subscription } from '../../../src/models/Subscription';
import { Uuid } from '../../../src/models/Uuid';
import { InvalidArgumentError } from '../../../src/errors/InvalidArgumentError';
import * as nock from 'nock';
import { AppConfig } from '../../../src/models/AppConfig';
import { EmailProfile } from '../../../src/models/EmailProfile';


interface LogoutEmailTestData {
  existingPushDeviceId: Uuid;
  emailDeviceId: Uuid;
  emailAuthHash: string;
}

async function logoutEmailTest(
  t: TestContext & Context<any>,
  testData: LogoutEmailTestData
) {
  await TestEnvironment.initialize();

  /* If an existing email device ID is set, create a fake one here */
  if (testData.emailDeviceId) {
    const emailProfile = await Database.getEmailProfile();
    emailProfile.emailId = testData.emailDeviceId;
    await Database.setEmailProfile(emailProfile);
  }

  /* If test data has an email auth has, fake the auth hash */
  if (testData.emailAuthHash) {
    const emailProfile = await Database.getEmailProfile();
    emailProfile.emailAuthHash = testData.emailAuthHash;
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
    testData.emailAuthHash,
    Uuid.generate(),
  );

  await OneSignal.logoutEmail();
}

async function expectEmailLogoutRequest(
  t: TestContext & Context<any>,
  pushDevicePlayerId: Uuid,
  emailId: Uuid,
  emailAuthHash: string,
  newUpdatedPlayerId: Uuid
) {
  nock('https://onesignal.com')
    .post(`/api/v1/players/${pushDevicePlayerId ? pushDevicePlayerId.value : 'fake'}/email_logout`)
    .reply(200, (uri, requestBody) => {
      t.deepEqual(
        requestBody,
        JSON.stringify({
          app_id: null,
          parent_player_id: emailId ? emailId.value : undefined,
          email_auth_hash: emailAuthHash ? emailAuthHash : undefined
        })
      );
      return { "success":true, "id": newUpdatedPlayerId.value };
    });
}

test("logoutEmail returns if not subscribed to web push", async t => {
  const testData = {
    existingPushDeviceId: null,
    emailDeviceId: Uuid.generate(),
    emailAuthHash: "b812f8616dff8ee2c7a4b308ef16e2da36928cfa80249f7c61d36d43f0a521e7",
  }

  await logoutEmailTest(t, testData);

  // Confirm email details have not been erased
  const emailProfile = await Database.getEmailProfile();
  t.deepEqual(emailProfile.emailId, testData.emailDeviceId);
  t.deepEqual(emailProfile.emailAuthHash, testData.emailAuthHash);
});

test("logoutEmail calls POST email_logout and clears local data", async t => {
  const testData = {
    existingPushDeviceId: Uuid.generate(),
    emailDeviceId: Uuid.generate(),
    emailAuthHash: "b812f8616dff8ee2c7a4b308ef16e2da36928cfa80249f7c61d36d43f0a521e7",
  }
  await logoutEmailTest(t, testData);

  // Confirm email details have been erased
  const { deviceId: finalPushDeviceId } = await Database.getSubscription();
  const finalEmailProfile = await Database.getEmailProfile();
  t.deepEqual(finalPushDeviceId.value, testData.existingPushDeviceId ? testData.existingPushDeviceId.value : null);
  t.deepEqual(finalEmailProfile.emailAddress, undefined);
  t.deepEqual(finalEmailProfile.emailAuthHash, undefined);
  t.deepEqual(finalEmailProfile.emailId.value, null);
});

