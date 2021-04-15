import "../../support/polyfills/polyfills";
import anyTest, { ExecutionContext, TestInterface } from "ava";
import { TestEnvironment } from '../../support/sdk/TestEnvironment';
import OneSignal from '../../../src/OneSignal';
import nock from 'nock';
import Database from '../../../src/services/Database';
import { EmailProfile } from '../../../src/models/EmailProfile';
import { Subscription } from '../../../src/models/Subscription';

const EMAIL_ID = "dafb31e3-19a5-473c-b319-62082bd696fb";
const EMAIL = "test@example.com";
const EMAIL_AUTH_HASH = "email-auth-hash";
const DEVICE_ID = "55b9bc29-5f07-48b9-b85d-7e6efe2396fb";

interface SendTagsContext {
  simpleTags: Object;
  sentTags  : Object;
  expectedTags: Object;
  expectedTagsUnsent: string[];
  tagsToCheckDeepEqual: Object;
}

const test = anyTest as TestInterface<SendTagsContext>;

test.beforeEach(t => {
  t.context.simpleTags = {
    string: 'This is a string.',
    number: 123456789,
  };

  t.context.sentTags = {
    null: null,
    undefined: undefined,
    true: true,
    false: false,
    string: 'This is a string.',
    number: 123456789,
    decimal: 123456789.987654321,
    'array.empty': [],
    'array.one': [1],
    'array.multi': [1, 2, 3],
    'array.nested': [0, [1], [[2]]],
    'object.empty': {},
    'object.one': JSON.stringify({ key: 'value' } ) ,
    'object.multi': JSON.stringify({ a: 1, b: 2, c: 3 }),
    'object.nested': JSON.stringify({ a0: 1, b0: { a1: 1, b1: 1 }, c0: { a1: 1, b1: { a2: 1, b2: { a3: 1 } } } })
  };

  t.context.expectedTags = {
    number: "123456789",
    true: "true",
    false: "false",
    string: "This is a string.",
    decimal: "123456789.98765433",
    "array.one": "[1]",
    "array.multi": "[1, 2, 3]",
    "array.nested": "[0, [1], [[2]]]",
    "object.one": '{"key":"value"}',
    "object.multi": '{"a":1,"b":2,"c":3}',
    "object.nested": '{"a0":1,"b0":{"a1":1,"b1":1},"c0":{"a1":1,"b1":{"a2":1,"b2":{"a3":1}}}}'
  };

  t.context.expectedTagsUnsent = ['null', 'undefined', 'array.empty', 'object.empty'];

  t.context.tagsToCheckDeepEqual = Object.keys(t.context.sentTags)
    .filter(x => t.context.expectedTagsUnsent.concat(['string', 'false']).indexOf(x) < 0);
});

async function expectPushRecordTagUpdateRequest(
  t: ExecutionContext<SendTagsContext>,
  pushDevicePlayerId: string,
  identifierAuthHash: string | undefined,
) {
  nock('https://onesignal.com')
    .put(`/api/v1/players/${pushDevicePlayerId}`)
    .reply(200, (_uri: string, requestBody: any) => {
      t.deepEqual(
        requestBody,
        JSON.stringify({
          app_id: OneSignal.context.appConfig.appId,
          tags: t.context.simpleTags,
          identifier_auth_hash: identifierAuthHash ? identifierAuthHash : undefined,
        })
      );
      return { success : true };
    });
}

test("sendTags sends to email record and push record with email auth hash", async t => {
  await TestEnvironment.initialize();
  TestEnvironment.mockInternalOneSignal();

  const emailProfile = new EmailProfile(EMAIL_ID, EMAIL, EMAIL_AUTH_HASH);
  if (!emailProfile.playerId) {
    throw new Error("Email id required.");
  }
  const subscription = new Subscription();
  subscription.deviceId = DEVICE_ID;
  await Database.setSubscription(subscription);
  await Database.put('Ids', { type: 'appId', id: OneSignal.context.appConfig.appId });
  await Database.setEmailProfile(emailProfile);
  expectPushRecordTagUpdateRequest(t, emailProfile.playerId, emailProfile.identifierAuthHash);
  expectPushRecordTagUpdateRequest(t, subscription.deviceId, undefined);
  await OneSignal.sendTags(t.context.simpleTags);
});

test("sendTags sends to email record and push record without email auth hash", async t => {
  await TestEnvironment.initialize();
  TestEnvironment.mockInternalOneSignal();

  const emailProfile = new EmailProfile(EMAIL_ID, EMAIL);
  if (!emailProfile.playerId) {
    throw new Error("Email id required.");
  }

  const subscription = new Subscription();
  subscription.deviceId = DEVICE_ID;
  await Database.setSubscription(subscription);
  await Database.put('Ids', { type: 'appId', id: OneSignal.context.appConfig.appId });
  await Database.setEmailProfile(emailProfile);
  expectPushRecordTagUpdateRequest(t, emailProfile.playerId, emailProfile.identifierAuthHash);
  expectPushRecordTagUpdateRequest(t, subscription.deviceId, undefined);
  await OneSignal.sendTags(t.context.simpleTags);
});

test("sendTags sends to push record only without email", async t => {
  await TestEnvironment.initialize();
  TestEnvironment.mockInternalOneSignal();

  const subscription = new Subscription();
  subscription.deviceId = DEVICE_ID;
  await Database.setSubscription(subscription);
  await Database.put('Ids', { type: 'appId', id: OneSignal.context.appConfig.appId });
  await Database.setEmailProfile(new EmailProfile());

  expectPushRecordTagUpdateRequest(t, subscription.deviceId, undefined);
  await OneSignal.sendTags(t.context.simpleTags);
});
