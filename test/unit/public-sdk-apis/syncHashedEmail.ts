import "../../support/polyfills/polyfills";
import test from "ava";
import {TestEnvironment} from "../../support/sdk/TestEnvironment";
import { isValidEmail, prepareEmailForHashing } from '../../../src/utils';
import Crypto from "../../../src/services/Crypto";


test("isValidEmail accepts legal emails", async t => {
  var validEmails = [
    'jason@onesignal.com',
    'jason+1@onesignal.com',
    'jason.1@onesignal.com',
    'jason-1@onesignal.com',
    'jason@onesignal.com.br',
    'jason@onesignal.com.br.eu.tz',
    'jason@gmail.org',
    'jason.test.1.-4+2@onesignal.com',
    'monorail+v2.3275348242@chromium.org',
    'chromium@monorail-prod.appspotmail.com',
    'chrome-dev-summit-noreply@google.com',
    'notifications+admin_only_129918_8de78bb5398c1c185fded6cca7abebafae790396@mail.intercom.io',
    'notifications+admin_only_129918_1ca9a353350f0f69053fb0aae767614baccee697@mail.intercom.io',
    'george.deglin@onesignal.mail.intercom.io',
    'a@b.c',
    'name@domain.super-long-top-level-domain-name-extension',
    'jason 1@onesignal.com', // Yep this is valid apparently
  ];
  for (let email of validEmails) {
    t.true(isValidEmail(email));
  }
});

test("isValidEmail rejects illegal emails", async t => {
  var invalidEmails = [
    null,
    undefined,
    '',
    '    ',
    'jason@myhostname',
    'jason',
    'a',
    '@',
    'jason@@gmail.com',
    'jason@gmail..com',
  ];
  for (let email of invalidEmails) {
    t.false(isValidEmail(email));
  }
});

test("syncHashedEmail should update player hashed email", async t => {
  await TestEnvironment.initialize();
  let email = 'test@test2.com';
  let preppedEmail = prepareEmailForHashing(email);
  t.true(isValidEmail(preppedEmail));
  t.is(Crypto.md5(preppedEmail), '3e1163777d25d2b935057c3ae393efee');
  t.is(Crypto.sha1(preppedEmail), '69e9ca5af84bc88bc185136cd6f782ee889be5c8');
  t.is(Crypto.sha256(preppedEmail), '72ed496d03fd58b010c1851e74de7f7e04fd041fd8ec004ca65946e775c9471b');
});

test("syncHashedEmail email hashes should not be case sensitive", async t => {
  await TestEnvironment.initialize();
  let email = 'Test@tEst.CoM';
  let preppedEmail = prepareEmailForHashing(email);
  t.true(isValidEmail(preppedEmail));
  t.is(Crypto.md5(preppedEmail), 'b642b4217b34b1e8d3bd915fc65c4452');
  t.is(Crypto.sha1(preppedEmail), 'a6ad00ac113a19d953efb91820d8788e2263b28a');
  t.is(Crypto.sha256(preppedEmail), 'f660ab912ec121d1b1e928a0bb4bc61b15f5ad44d5efdc4e1c92a25e99b8e44a');
});

test("syncHashedEmail email hashes should ignore whitespace", async t => {
  await TestEnvironment.initialize();
  let email = ' test@test2.com ';
  let preppedEmail = prepareEmailForHashing(email);
  t.true(isValidEmail(preppedEmail));
  t.is(Crypto.md5(preppedEmail), '3e1163777d25d2b935057c3ae393efee');
  t.is(Crypto.sha1(preppedEmail), '69e9ca5af84bc88bc185136cd6f782ee889be5c8');
  t.is(Crypto.sha256(preppedEmail), '72ed496d03fd58b010c1851e74de7f7e04fd041fd8ec004ca65946e775c9471b');
});
