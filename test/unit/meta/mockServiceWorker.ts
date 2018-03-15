import '../../support/polyfills/polyfills';

import test from 'ava';
import * as sinon from 'sinon';

import { ServiceWorkerManager, ServiceWorkerActiveState } from '../../../src/managers/ServiceWorkerManager';
import Path from '../../../src/models/Path';
import { TestEnvironment, HttpHttpsEnvironment } from '../../support/sdk/TestEnvironment';
import ServiceWorkerRegistration from '../../support/mocks/service-workers/models/ServiceWorkerRegistration';
import ServiceWorker from '../../support/mocks/service-workers/ServiceWorker';
import { beforeEach } from '../../support/tester/typify';
import Database from '../../../src/services/Database';
import IndexedDb from '../../../src/services/IndexedDb';
import Context from '../../../src/models/Context';

import { AppConfig } from '../../../src/models/AppConfig';
import { SubscriptionManager } from '../../../src/managers/SubscriptionManager';
import { base64ToUint8Array } from '../../../src/utils/Encoding';
import PushManager from '../../support/mocks/service-workers/models/PushManager';
import { ServiceWorkerContainer } from '../../support/mocks/service-workers/ServiceWorkerContainer';

const VAPID_PUBLIC_KEY_1 = 'CAdXhdGDgXJfJccxabiFhmlyTyF17HrCsfyIj3XEhg2j-RmT4wXU7lHiBPqSKSotvtfejZlAaPywJ3E-3AxXQBj1';
const VAPID_PUBLIC_KEY_2 =
  'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEgrjd4cWBgjEtiIqh45fbzkJdlr8ir7ZidvNzMAsHP_uBQuPsn1n5QWYqJy80fkkjbf-1LH99C_y9RjLGjsesUg';

test.beforeEach(async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });
});

test('mock service worker browser API properties should exist', async t => {
  t.true(navigator.serviceWorker instanceof ServiceWorkerContainer);
  t.true(navigator.serviceWorker.getRegistration instanceof Function);
  t.true(navigator.serviceWorker.getRegistrations instanceof Function);
  t.true(navigator.serviceWorker.ready instanceof Promise);
  t.true(navigator.serviceWorker.register instanceof Function);
  t.true(navigator.serviceWorker.addEventListener instanceof Function);
});

test('mock service worker should not return an existing registration for a clean run', async t => {
  t.is(navigator.serviceWorker.controller, null);

  const registration = await navigator.serviceWorker.getRegistration();
  t.is(registration, null);

  const registrations = await navigator.serviceWorker.getRegistrations();
  t.deepEqual(registrations, []);
});


test('mock service worker registration should return the registered worker', async t => {
  await navigator.serviceWorker.register('/worker.js', { scope: '/' });

  t.true(navigator.serviceWorker.controller instanceof ServiceWorker);

  const registration = await navigator.serviceWorker.getRegistration();
  t.true(registration instanceof ServiceWorkerRegistration);

  const registrations = await navigator.serviceWorker.getRegistrations();
  t.deepEqual(registrations, [registration]);
});


test('mock service worker unregistration should return no registered workers', async t => {
  await navigator.serviceWorker.register('/worker.js', { scope: '/' });

  const initialRegistration = await navigator.serviceWorker.getRegistration();
  await initialRegistration.unregister();

  const postUnsubscribeRegistration = await navigator.serviceWorker.getRegistration();
  t.is(postUnsubscribeRegistration, null);

  const registrations = await navigator.serviceWorker.getRegistrations();
  t.deepEqual(registrations, []);
});
