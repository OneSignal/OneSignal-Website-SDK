import test from 'ava';

import { TestEnvironment, HttpHttpsEnvironment } from '../../support/sdk/TestEnvironment';
import { MockServiceWorkerContainerWithAPIBan } from "../../support/mocks/service-workers/models/MockServiceWorkerContainerWithAPIBan";

test.beforeEach(async t => {
  await TestEnvironment.initialize({
    httpOrHttps: HttpHttpsEnvironment.Https
  });
});

test('mock service worker browser API properties should exist', async t => {
  t.true(navigator.serviceWorker instanceof MockServiceWorkerContainerWithAPIBan);
  t.true(navigator.serviceWorker.addEventListener instanceof Function);
});

test('mock service worker should not return an existing registration for a clean run', async t => {
  const registration = await navigator.serviceWorker.getRegistration(`${location.origin}/`);
  t.is(registration, undefined);

  const registrations = await navigator.serviceWorker.getRegistrations();
  t.deepEqual(registrations, []);
});

test('mock service worker unregistration should return no registered workers', async t => {
  await navigator.serviceWorker.register('/worker.js', { scope: '/' });

  const initialRegistration = await navigator.serviceWorker.getRegistration(`${location.origin}/`);
  await initialRegistration!.unregister();

  const postUnsubscribeRegistration = await navigator.serviceWorker.getRegistration(`${location.origin}/`);
  t.is(postUnsubscribeRegistration, undefined);

  const registrations = await navigator.serviceWorker.getRegistrations();
  t.deepEqual(registrations, []);
});

test('Should throw when calling navigator.serviceWorker.controller', async t => {
  try {
    navigator.serviceWorker!.controller;
    t.fail("Should have thrown!");
  } catch (e) {
    t.deepEqual(e, new Error("Don't use, assumes page control!"));
  }
});

test('Should throw when calling navigator.serviceWorker.ready', async t => {
  try {
    await navigator.serviceWorker!.ready;
    t.fail("Should have thrown!");
  } catch (e) {
    t.deepEqual(e, new Error("Don't use, assumes page control!"));
  }
});

test('Should throw when calling navigator.serviceWorker.getRegistration without a url', async t => {
  try {
    await navigator.serviceWorker!.getRegistration();
    t.fail("Should have thrown!");
  } catch (e) {
    t.deepEqual(e, new Error("Must include clientURL to get the SW of the scope we registered, not the current page being viewed."));
  }
});

test('Should throw when calling navigator.serviceWorker.getRegistration with a relative URL', async t => {
  try {
    await navigator.serviceWorker!.getRegistration("/");
    t.fail("Should have thrown!");
  } catch (e) {
    t.deepEqual(e, new Error("Must always use full URL as the HTML <base> tag can change the relative path."));
  }
});

test('Should throw when setting navigator.serviceWorker.oncontrollerchange', async t => {
  try {
    navigator.serviceWorker.oncontrollerchange = function(){};
    t.fail("Should have thrown!");
  } catch (e) {
    t.deepEqual(e, new Error("Don't use, assumes page control!"));
  }
});

test('Should throw when setting navigator.serviceWorker.addEventListener(controllerchange, ...)', async t => {
  try {
    navigator.serviceWorker.addEventListener('controllerchange', function(){});
    t.fail("Should have thrown!");
  } catch (e) {
    t.deepEqual(e, new Error("Don't use, assumes page control!"));
  }
});

test('Should not throw when setting navigator.serviceWorker.addEventListener(message, ...)', async t => {
  navigator.serviceWorker.addEventListener('message', function(){});
  t.pass();
});

test('Should not throw when setting navigator.serviceWorker.addEventListener(messageerror, ...)', async t => {
  navigator.serviceWorker.addEventListener('messageerror', function(){});
  t.pass();
});