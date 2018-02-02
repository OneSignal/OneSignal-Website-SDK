import "../../support/polyfills/polyfills";
import test from "ava";
import { TestEnvironment } from '../../support/sdk/TestEnvironment';
import OneSignal from '../../../src/OneSignal';
import * as nock from 'nock';
import Database from '../../../src/services/Database';
import { EmailProfile } from "../../../src/models/EmailProfile";
import { Uuid } from '../../../src/models/Uuid';
import { Subscription } from '../../../src/models/Subscription';

test.beforeEach(t => {
  t.context.simpleTags = {
    'string': 'This is a string.',
    'number': 123456789,
  };

  t.context.sentTags = {
    'null': null,
    'undefined': undefined,
    'true': true,
    'false': false,
    'string': 'This is a string.',
    'number': 123456789,
    'decimal': 123456789.987654321,
    'array.empty': [],
    'array.one': [1],
    'array.multi': [1, 2, 3],
    'array.nested': [0, [1], [[2]]],
    'object.empty': {},
    'object.one': JSON.stringify({key: 'value'}),
    'object.multi': JSON.stringify({a: 1, b: 2, c: 3}),
    'object.nested': JSON.stringify({a0: 1, b0: {a1: 1, b1: 1}, c0: {a1: 1, b1: {a2: 1, b2: {a3: 1}}}})
  };

  t.context.expectedTags = {
    "number": "123456789",
    "true": "true",
    "false": "false",
    "string": "This is a string.",
    "decimal": "123456789.98765433",
    "array.one": "[1]",
    "array.multi": "[1, 2, 3]",
    "array.nested": "[0, [1], [[2]]]",
    "object.one": '{"key":"value"}',
    "object.multi": '{"a":1,"b":2,"c":3}',
    "object.nested": '{"a0":1,"b0":{"a1":1,"b1":1},"c0":{"a1":1,"b1":{"a2":1,"b2":{"a3":1}}}}'
  };

  t.context.expectedTagsUnsent = ['null', 'undefined', 'array.empty', 'object.empty'];

  t.context.tagsToCheckDeepEqual = Object.keys(t.context.sentTags).filter(x => t.context.expectedTagsUnsent.concat(['string', 'false']).indexOf(x) < 0);
});

test("sendTags sends to email record and push record", async t => {
  await TestEnvironment.initialize();

  const emailProfile = new EmailProfile();
  emailProfile.emailId = new Uuid("dafb31e3-19a5-473c-b319-62082bd696fb");
  emailProfile.emailAddress = "test@example.com";
  emailProfile.emailAuthHash = "email-auth-hash";

  const subscription = new Subscription();
  subscription.deviceId = new Uuid("55b9bc29-5f07-48b9-b85d-7e6efe2396fb");
  await Database.setSubscription(subscription);

  await Database.setEmailProfile(emailProfile);
  const emailMock = nock('https://onesignal.com')
  .put(`/api/v1/players/${emailProfile.emailId}`)
  .reply(200, (uri, requestBody) => {
    t.deepEqual(
      JSON.parse(requestBody),
      { app_id: null, tags: t.context.simpleTags },
    );
    return {};
  });

  const pushMock = nock('https://onesignal.com')
  .put(`/api/v1/players/${subscription.deviceId}`)
  .reply(200, (uri, requestBody) => {
    t.deepEqual(
      JSON.parse(requestBody),
      { app_id: null, tags: t.context.simpleTags },
    );
    return {};
  });

  await OneSignal.sendTags(t.context.simpleTags);
});

test("sendTags sends to push record only without email", async t => {
  await TestEnvironment.initialize();

  const emailProfile = new EmailProfile();
  emailProfile.emailId = new Uuid("dafb31e3-19a5-473c-b319-62082bd696fb");
  emailProfile.emailAddress = "test@example.com";
  emailProfile.emailAuthHash = "email-auth-hash";

  const subscription = new Subscription();
  subscription.deviceId = new Uuid("55b9bc29-5f07-48b9-b85d-7e6efe2396fb");
  await Database.setSubscription(subscription);

  const pushMock = nock('https://onesignal.com')
  .put(`/api/v1/players/${subscription.deviceId}`)
  .reply(200, (uri, requestBody) => {
    t.deepEqual(
      JSON.parse(requestBody),
      { app_id: null, tags: t.context.simpleTags },
    );
    return {};
  });

  await OneSignal.sendTags(t.context.simpleTags);
});
