import "../../support/polyfills/polyfills";
import test, { ExecutionContext } from "ava";
import Database from "../../../src/shared/services/Database";
import { TestEnvironment, BrowserUserAgent } from "../../support/sdk/TestEnvironment";
import OneSignal from "../../../src/onesignal/OneSignal";

import { InvalidArgumentError } from '../../../src/shared/errors/InvalidArgumentError';
import nock from 'nock';
import Random from "../../support/tester/Random";
import { setUserAgent } from "../../support/tester/browser";
import { awaitSubscriptionChangeEvent } from "../../support/tester/ChannelSubscriptionChangeEventHelper";
import { NockOneSignalHelper } from "../../support/tester/NockOneSignalHelper";

test.beforeEach(async _t => {
  await TestEnvironment.initialize();
  TestEnvironment.mockInternalOneSignal();
  await Database.put('Ids', { type: 'appId', id: OneSignal.context.appConfig.appId });
});

test("setEmail should reject an empty or invalid emails", async t => {
  try {
    await OneSignal.setEmail(undefined as any);
    t.fail('expected exception not caught');
  } catch (e) {
    t.truthy(e instanceof InvalidArgumentError);
  }

  try {
    await OneSignal.setEmail(null as any);
    t.fail('expected exception not caught');
  } catch (e) {
    t.truthy(e instanceof InvalidArgumentError);
  }

  try {
    await OneSignal.setEmail(null as any);
    t.fail('expected exception not caught');
  } catch (e) {
    t.truthy(e instanceof InvalidArgumentError);
  }

  try {
    await OneSignal.setEmail("test@@example.com");
    t.fail('expected exception not caught');
  } catch (e) {
    t.truthy(e instanceof InvalidArgumentError);
  }
});

test("setEmail should not accept an email auth SHA-256 hex hash not 64 characters long", async t => {
  try {
    await OneSignal.setEmail("test@example.com", {
      identifierAuthHash: "12345"
    });
    t.fail('expected exception not caught');
  } catch (e) {
    t.truthy(e instanceof InvalidArgumentError);
  }
});

/*
 * Test Case | Description
 * -----------------------
 * No push subscription, no email, first setEmail call
 * No push subscription, existing identical email, refreshing setEmail call
 * No push subscription, existing different email, updating email
 * Existing push subscription, no email, first setEmail call
 * Existing push subscription, existing identical email, refreshing setEmail call
 * Existing push subscription, existing different email, updating email
 *
 * ---
 *
 * ..., existing email (identical or not), identifierAuthHash --> makes a PUT call instead of POST
 */

async function expectEmailRecordCreationRequest(
  t: ExecutionContext,
  emailAddress: string,
  pushDevicePlayerId: string | null,
  identifierAuthHash: string | undefined | null,
  newCreatedEmailId: string
) {
  nock('https://onesignal.com')
    .post(`/api/v1/players`)
    .reply(200, (_uri: string, requestBody: any) => {
      const sameValues: {[key: string]: string | undefined } = {
        app_id: OneSignal.context.appConfig.appId,
        identifier: emailAddress,
        device_player_id: pushDevicePlayerId ? pushDevicePlayerId : undefined,
        identifier_auth_hash: identifierAuthHash ? identifierAuthHash : undefined
      };
      const anyValues = [
        "device_type",
        "language",
        "timezone",
        "timezone_id",
        "device_os",
        "sdk",
        "device_model"
      ];
      const parsedRequestBody = JSON.parse(requestBody);
      for (const sameValueKey of Object.keys(sameValues)) {
        t.deepEqual(parsedRequestBody[sameValueKey], sameValues[sameValueKey]);
      }
      for (const anyValueKey of anyValues) {
        t.not(parsedRequestBody[anyValueKey], undefined);
      }
      return { success : true, id: newCreatedEmailId };
    });
}

async function expectEmailRecordUpdateRequest(
  t: ExecutionContext,
  emailId: string | null,
  emailAddress: string,
  pushDevicePlayerId: string | null,
  identifierAuthHash: string | undefined,
  newUpdatedEmailId: string
) {
  nock('https://onesignal.com')
    .put(`/api/v1/players/${emailId}`)
    .reply(200, (_uri: string, requestBody: any) => {
      const sameValues: {[key: string]: string | undefined } = {
        app_id: OneSignal.context.appConfig.appId,
        identifier: emailAddress,
        device_player_id: pushDevicePlayerId ? pushDevicePlayerId : undefined,
        identifier_auth_hash: identifierAuthHash ? identifierAuthHash : undefined
      };
      const parsedRequestBody = JSON.parse(requestBody);
      for (const sameValueKey of Object.keys(sameValues)) {
        t.deepEqual(parsedRequestBody[sameValueKey], sameValues[sameValueKey]);
      }
      return { success : true, id : newUpdatedEmailId };
    });
}

async function expectPushRecordUpdateRequest(
  t: ExecutionContext,
  pushDevicePlayerId: string,
  newEmailId: string,
  emailAddress: string,
  newUpdatedPlayerId: string,
  externalUserIdAuth?: string | null
) {
  nock('https://onesignal.com')
    .put(`/api/v1/players/${pushDevicePlayerId}`)
    .reply(200, (_uri: string, requestBody: any) => {
      t.deepEqual(
        requestBody,
        JSON.stringify({
          app_id: OneSignal.context.appConfig.appId,
          parent_player_id: newEmailId ? newEmailId : undefined,
          email: emailAddress,
          external_user_id_auth_hash: externalUserIdAuth
        })
      );
      return { success : true, id : newUpdatedPlayerId };
    });
}

interface SetEmailTestData {
  existingEmailAddress: string | null;
  newEmailAddress: string; /* Email address used for setEmail */
  existingPushDeviceId: string | null;
  identifierAuthHash: string | undefined;
  existingEmailId: string | null;
  newEmailId: string; /* Returned by the create or update email record call */
  externalUserIdAuthHash?: string | null;
}

async function setEmailTest(
  t: ExecutionContext,
  testData: SetEmailTestData
) {
  setUserAgent(BrowserUserAgent.FirefoxMacSupported);

  if (testData.existingEmailAddress) {
    const emailProfile = await Database.getEmailProfile();
    emailProfile.identifier = testData.existingEmailAddress;
    await Database.setEmailProfile(emailProfile);
  }

  /* If an existing push device ID is set, create a fake one here */
  if (testData.existingPushDeviceId) {
    const subscription = await Database.getSubscription();
    subscription.deviceId = testData.existingPushDeviceId;
    await Database.setSubscription(subscription);
  }

  /* If test data has an email auth hash, fake the config parameter */
  if (testData.identifierAuthHash) {
    const emailProfile = await Database.getEmailProfile();
    emailProfile.identifierAuthHash = testData.identifierAuthHash;
    await Database.setEmailProfile(emailProfile);
  }

  if (testData.existingEmailId) {
    const emailProfile = await Database.getEmailProfile();
    emailProfile.subscriptionId = testData.existingEmailId;
    await Database.setEmailProfile(emailProfile);
  }

  // Mock the one or two requests we expect to occur
  const isUpdateRequest = testData.existingEmailId;

  if (isUpdateRequest) {
    // Means we're making a PUT call to /players/<id>
    await expectEmailRecordUpdateRequest(
      t,
      testData.existingEmailId,
      testData.newEmailAddress,
      testData.existingPushDeviceId,
      testData.identifierAuthHash,
      testData.newEmailId
    );
  } else {
    // Means we're making a POST call to /players
    await expectEmailRecordCreationRequest(
      t,
      testData.newEmailAddress,
      testData.existingPushDeviceId,
      testData.identifierAuthHash,
      testData.newEmailId
    );
  }

  if (
      testData.existingPushDeviceId &&
      !(
        testData.existingEmailId === testData.newEmailId &&
        testData.existingEmailAddress === testData.newEmailAddress
      )
    ) {
    /*
      Expect a second call to be made if:
        - We're subscribed to web push (existing player ID)
        - The email ID or plain text email address changes from what we have saved, or if neither was ever saved
    */
    await expectPushRecordUpdateRequest(
      t,
      testData.existingPushDeviceId,
      testData.newEmailId,
      testData.newEmailAddress,
      Random.getRandomUuid(),
      testData.externalUserIdAuthHash
    );
  }

  await OneSignal.setEmail(
    testData.newEmailAddress,
    testData.identifierAuthHash ?
      { identifierAuthHash: testData.identifierAuthHash } :
      undefined
  );

  const { deviceId: finalPushDeviceId } = await Database.getSubscription();
  const finalEmailProfile = await Database.getEmailProfile();

  t.deepEqual(finalPushDeviceId, testData.existingPushDeviceId ? testData.existingPushDeviceId : null);
  t.deepEqual(finalEmailProfile.identifier, testData.newEmailAddress);
  t.deepEqual(finalEmailProfile.identifierAuthHash, testData.identifierAuthHash);
  t.deepEqual(finalEmailProfile.subscriptionId, testData.newEmailId);
}

test("No push subscription, no email, first setEmail call", async t => {
  const testData: SetEmailTestData = {
    existingEmailAddress: null,
    newEmailAddress: "test@example.com",
    existingPushDeviceId: null,
    identifierAuthHash: undefined,
    existingEmailId: null,
    newEmailId: Random.getRandomUuid()
  };
  await setEmailTest(t, testData);
});

test("No push subscription, no email, first setEmail call, test email id return", async t => {
  const fakeUuid = Random.getRandomUuid();
  await expectEmailRecordCreationRequest(
    t,
    "example@domain.com",
    null,
    null,
    fakeUuid
  );
  setUserAgent(BrowserUserAgent.FirefoxMacSupported);
  t.is(await OneSignal.setEmail("example@domain.com"), fakeUuid);
});

test("No push subscription, existing identical email, refreshing setEmail call", async t => {
  const emailId = Random.getRandomUuid();
  const testData: SetEmailTestData = {
    existingEmailAddress: "test@example.com",
    newEmailAddress: "test@example.com",
    existingPushDeviceId: null,
    identifierAuthHash: undefined,
    existingEmailId: emailId,
    newEmailId: emailId
  };
  await setEmailTest(t, testData);
});

test("No push subscription, existing different email, updating setEmail call", async t => {
  const existingEmailId = Random.getRandomUuid();
  const testData: SetEmailTestData = {
    existingEmailAddress: "existing-different-email-address@example.com",
    newEmailAddress: "test@example.com",
    existingPushDeviceId: null,
    identifierAuthHash: undefined,
    existingEmailId: existingEmailId,
    newEmailId: existingEmailId
  };
  await setEmailTest(t, testData);
});

test("Existing push subscription, no email, first setEmail call", async t => {
  const testData: SetEmailTestData = {
    existingEmailAddress: null,
    newEmailAddress: "test@example.com",
    existingPushDeviceId: Random.getRandomUuid(),
    identifierAuthHash: undefined,
    existingEmailId: null,
    newEmailId: Random.getRandomUuid(),
    externalUserIdAuthHash: null
  };
  await setEmailTest(t, testData);
});

test("Existing push subscription, existing identical email, refreshing setEmail call", async t => {
  const emailId = Random.getRandomUuid();
  const testData = {
    existingEmailAddress: "test@example.com",
    newEmailAddress: "test@example.com",
    identifierAuthHash: undefined,
    existingEmailId: emailId,
    newEmailId: emailId
  } as SetEmailTestData;
  await setEmailTest(t, testData);
});


test("Existing push subscription, existing different email, updating setEmail call", async t => {
  const existingEmailId = Random.getRandomUuid();
  const testData = {
    existingEmailAddress: "existing-different-email@example.com",
    newEmailAddress: "test@example.com",
    identifierAuthHash: undefined,
    existingEmailId: existingEmailId,
    newEmailId: existingEmailId,
    externalUserIdAuthHash: null
  } as SetEmailTestData;
  await setEmailTest(t, testData);
});

test(
  "Existing push subscription, existing identical email, with identifierAuthHash, refreshing setEmail call",
  async t => {
    const existingEmailId = Random.getRandomUuid();
    const testData = {
      existingEmailAddress: "existing-different-email@example.com",
      newEmailAddress: "test@example.com",
      identifierAuthHash: "432B5BE752724550952437FAED4C8E2798E9D0AF7AACEFE73DEA923A14B94799",
      existingEmailId: existingEmailId,
      newEmailId: existingEmailId,
      externalUserIdAuthHash: null
    } as SetEmailTestData;
    await setEmailTest(t, testData);
});

test(
  "Setting email causes 'emailSubscriptionChanged' event to fire with email identifier in event callback",
  async t => {
    NockOneSignalHelper.nockPlayerPost();
    const subscriptionChangeEventPromise = awaitSubscriptionChangeEvent("emailSubscriptionChanged");

    await OneSignal.setEmail("example@domain.com");
    const event = await subscriptionChangeEventPromise as {email: string};
    t.is(event["email"], "example@domain.com");
});
