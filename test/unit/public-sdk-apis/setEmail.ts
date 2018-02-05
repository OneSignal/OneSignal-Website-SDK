import "../../support/polyfills/polyfills";
import test, { TestContext, Context } from "ava";
import Database from "../../../src/services/Database";
import Macros from "../../support/tester/Macros";
import {TestEnvironment} from "../../support/sdk/TestEnvironment";
import OneSignal from "../../../src/OneSignal";
import { Subscription } from '../../../src/models/Subscription';
import { Uuid } from '../../../src/models/Uuid';
import { InvalidArgumentError } from '../../../src/errors/InvalidArgumentError';
import * as nock from 'nock';
import { AppConfig } from '../../../src/models/AppConfig';
import { EmailProfile } from '../../../src/models/EmailProfile';

test("setEmail should reject an empty or invalid emails", async t => {
    await TestEnvironment.initialize();
  try {
    await OneSignal.setEmail(undefined);
    t.fail('expected exception not caught');
  } catch (e) {
    t.truthy(e instanceof InvalidArgumentError);
  }

  try {
    await OneSignal.setEmail(null);
    t.fail('expected exception not caught');
  } catch (e) {
    t.truthy(e instanceof InvalidArgumentError);
  }

  try {
    await OneSignal.setEmail(null);
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
  await TestEnvironment.initialize();
  try {
    await OneSignal.setEmail("test@example.com", {
      emailAuthHash: "12345"
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
 * ..., existing email (identical or not), emailAuthHash --> makes a PUT call instead of POST
 */

async function expectEmailRecordCreationRequest(
  t: TestContext & Context<any>,
  emailAddress: string,
  pushDevicePlayerId: Uuid,
  emailAuthHash: string,
  newCreatedEmailId: Uuid
) {
  nock('https://onesignal.com')
    .post(`/api/v1/players`)
    .reply(200, (uri, requestBody) => {
      t.deepEqual(
        requestBody,
        JSON.stringify({
          app_id: null,
          device_type: 11,
          identifier: emailAddress,
          device_player_id: pushDevicePlayerId ? pushDevicePlayerId.value : undefined,
          email_auth_hash: emailAuthHash ? emailAuthHash : undefined
        })
      );
      return { "success":true, "id": newCreatedEmailId.value };
    });
}

async function expectEmailRecordUpdateRequest(
  t: TestContext & Context<any>,
  emailId: Uuid,
  emailAddress: string,
  pushDevicePlayerId: Uuid,
  emailAuthHash: string,
  newUpdatedEmailId: Uuid
) {
  nock('https://onesignal.com')
    .put(`/api/v1/players/${emailId.value}`)
    .reply(200, (uri, requestBody) => {
      t.deepEqual(
        requestBody,
        JSON.stringify({
          app_id: null,
          identifier: emailAddress,
          device_player_id: pushDevicePlayerId ? pushDevicePlayerId.value : undefined,
          email_auth_hash: emailAuthHash ? emailAuthHash : undefined
        })
      );
      return { "success":true, "id": newUpdatedEmailId.value };
    });
}

async function expectPushRecordUpdateRequest(
  t: TestContext & Context<any>,
  pushDevicePlayerId: Uuid,
  newEmailId: Uuid,
  emailAddress: string,
  newUpdatedPlayerId: Uuid
) {
  nock('https://onesignal.com')
    .put(`/api/v1/players/${pushDevicePlayerId.value}`)
    .reply(200, (uri, requestBody) => {
      t.deepEqual(
        requestBody,
        JSON.stringify({
          app_id: null,
          parent_player_id: newEmailId ? newEmailId.value : undefined,
          email: emailAddress,
        })
      );
      return { "success":true, "id": newUpdatedPlayerId.value };
    });
}

interface SetEmailTestData {
  existingEmailAddress: string;
  newEmailAddress: string; /* Email address used for setEmail */
  existingPushDeviceId: Uuid;
  emailAuthHash: string;
  existingEmailId: Uuid;
  newEmailId: Uuid; /* Returned by the create or update email record call */
}

async function setEmailTest(
  t: TestContext & Context<any>,
  testData: SetEmailTestData
) {

  if (testData.existingEmailAddress) {
    const emailProfile = await Database.getEmailProfile();
    emailProfile.emailAddress = testData.existingEmailAddress;
    await Database.setEmailProfile(emailProfile);
  }

  /* If an existing push device ID is set, create a fake one here */
  if (testData.existingPushDeviceId) {
    const subscription = await Database.getSubscription();
    subscription.deviceId = testData.existingPushDeviceId;
    await Database.setSubscription(subscription);
  }

  /* If test data has an email auth hash, fake the config parameter */
  if (testData.emailAuthHash) {
    const appConfig = await Database.getAppConfig();
    appConfig.emailAuthRequired = true;
    await Database.setAppConfig(appConfig);

    const emailProfile = await Database.getEmailProfile();
    emailProfile.emailAuthHash = testData.emailAuthHash;
    await Database.setEmailProfile(emailProfile);
  }

  if (testData.existingEmailId) {
    const emailProfile = await Database.getEmailProfile();
    emailProfile.emailId = testData.existingEmailId;
    await Database.setEmailProfile(emailProfile);
  }

  // Mock the one or two requests we expect to occur
  const isUpdateRequest = testData.emailAuthHash && testData.existingEmailId;

  if (!isUpdateRequest) {
    expectEmailRecordCreationRequest(
      t,
      testData.newEmailAddress,
      testData.existingPushDeviceId,
      testData.emailAuthHash,
      testData.newEmailId
    );
  } else {
    const { emailId: existingEmailId } = await Database.getEmailProfile();

    expectEmailRecordUpdateRequest(
      t,
      existingEmailId,
      testData.newEmailAddress,
      testData.existingPushDeviceId,
      testData.emailAuthHash,
      testData.newEmailId
    );
  }

  if (!(testData.existingEmailId === testData.newEmailId &&
      testData.existingEmailAddress === testData.newEmailAddress)) {
    expectPushRecordUpdateRequest(
      t,
      newTestData.existingPushDeviceId,
      newTestData.newCreatedEmailId,
      newTestData.emailAddress,
      Uuid.generate(),
    );
  }

  await OneSignal.setEmail(
    testData.newEmailAddress,
    testData.emailAuthHash ?
      { emailAuthHash: testData.emailAuthHash } :
      undefined
  );

  const { deviceId: finalPushDeviceId } = await Database.getSubscription();
  const finalEmailProfile = await Database.getEmailProfile();

  t.deepEqual(finalPushDeviceId.value, testData.existingPushDeviceId ? testData.existingPushDeviceId.value : null);
  t.deepEqual(finalEmailProfile.emailAddress, testData.newEmailAddress);
  t.deepEqual(finalEmailProfile.emailAuthHash, testData.emailAuthHash);
  t.deepEqual(finalEmailProfile.emailId, testData.newEmailId);
}

test("No push subscription, no email, first setEmail call", async t => {
  const testData = {
    emailAddress: "test@example.com",
    existingPushDeviceId: null,
    emailAuthHash: undefined,
    newCreatedEmailId: Uuid.generate()
  };
  await TestEnvironment.initialize();

  await setEmailTest(t, testData, SetEmailRequestType.Create);
});

test("No push subscription, existing identical email, refreshing setEmail call", async t => {
  const testData = {
    emailAddress: "test@example.com",
    existingPushDeviceId: null,
    emailAuthHash: undefined,
    newCreatedEmailId: Uuid.generate()
  };
  await TestEnvironment.initialize();

  await setEmailTest(t, testData, SetEmailRequestType.Create);

  // The second call simulates a new page view that sets the same email
  // Should not change anything
  await setEmailTest(t, testData, SetEmailRequestType.Create);
});

test("No push subscription, existing different email, updating setEmail call", async t => {
  let testData = {
    emailAddress: "test@example.com",
    existingPushDeviceId: null,
    emailAuthHash: undefined,
    newCreatedEmailId: Uuid.generate()
  };
  await TestEnvironment.initialize();

  await setEmailTest(t, testData, SetEmailRequestType.Create);

  const newTestData = {
    emailAddress: "new-test@example.com",
    existingPushDeviceId: null,
    emailAuthHash: undefined,
    newCreatedEmailId: Uuid.generate()
  };

  await setEmailTest(t, newTestData, SetEmailRequestType.Create);
});

test("Existing push subscription, no email, first setEmail call", async t => {
  let testData = {
    emailAddress: "test@example.com",
    existingPushDeviceId: Uuid.generate(),
    emailAuthHash: undefined,
    newCreatedEmailId: Uuid.generate()
  };
  await TestEnvironment.initialize();

  await setEmailTest(t, testData, SetEmailRequestType.Create);
});

test("Existing push subscription, existing identical email, refreshing setEmail call", async t => {
  let testData = {
    emailAddress: "test@example.com",
    existingPushDeviceId: Uuid.generate(),
    emailAuthHash: undefined,
    newCreatedEmailId: Uuid.generate()
  };
  await TestEnvironment.initialize();

  await setEmailTest(t, testData, SetEmailRequestType.Create);
  await setEmailTest(t, testData, SetEmailRequestType.Create);
});


test("Existing push subscription, existing different email, updating setEmail call", async t => {
  let testData = {
    emailAddress: "test@example.com",
    existingPushDeviceId: Uuid.generate(),
    emailAuthHash: undefined,
    newCreatedEmailId: Uuid.generate()
  };
  await TestEnvironment.initialize();

  await setEmailTest(t, testData, SetEmailRequestType.Create);

  const newTestData = {
    emailAddress: "new-test@example.com",
    existingPushDeviceId: testData.existingPushDeviceId,
    emailAuthHash: undefined,
    newCreatedEmailId: Uuid.generate()
  };

  expectPushRecordUpdateRequest(
    t,
    newTestData.existingPushDeviceId,
    newTestData.newCreatedEmailId,
    newTestData.emailAddress,
    Uuid.generate(),
  );

  await setEmailTest(t, newTestData, SetEmailRequestType.Create);
});

test(
  "Existing push subscription, existing identical email, with emailAuthHash, refreshing setEmail call",
  async t => {
    let testData = {
      emailAddress: "test@example.com",
      existingPushDeviceId: Uuid.generate(),
      emailAuthHash: "432B5BE752724550952437FAED4C8E2798E9D0AF7AACEFE73DEA923A14B94799",
      newCreatedEmailId: Uuid.generate()
    };
    await TestEnvironment.initialize();

    await setEmailTest(t, testData, SetEmailRequestType.Create);

    const finalEmailProfile = await Database.getEmailProfile();
    // On this second call, because the first call saved an email address / id, this next call will be a PUT update call
    await setEmailTest(t, testData, SetEmailRequestType.Update);
});
