import test from "ava";
import OneSignal from "../../../src/OneSignal";
import sinon, { SinonSandbox } from "sinon";
import Event from "../../../src/Event";
import OneSignalUtils from "../../../src/utils/OneSignalUtils";
import { TestEnvironment } from "../../support/sdk/TestEnvironment";
import * as Utils from "../../../src/utils";
import Database from "../../../src/services/Database";
import { InvalidArgumentError } from '../../../src/errors/InvalidArgumentError';

const sinonSandbox: SinonSandbox = sinon.sandbox.create();
const externalUserId = "external_email@example.com";

test.beforeEach(async () => {
  await TestEnvironment.initialize();
  TestEnvironment.mockInternalOneSignal();
});

test.afterEach(() => {
  sinonSandbox.restore();
});

test("setExternalUserId - executes after OneSignal is fully initialized", async t => {
  (global as any).OneSignal.initialized = false;
  (global as any).OneSignal._initCalled = false;

  sinonSandbox.stub(OneSignal.context.subscriptionManager, "isAlreadyRegisteredWithOneSignal").resolves(true);
  const databaseSpy = sinonSandbox.stub(OneSignal.database, "setExternalUserId").resolves();
  const updateManagerSpy = sinonSandbox.stub(OneSignal.context.updateManager, "sendExternalUserIdUpdate").resolves({
    success: true
  });

  let isPromiseDone = false;
  const promise = OneSignal.setExternalUserId(externalUserId).then(() => { isPromiseDone = true; });
  t.is(isPromiseDone, false);

  Event.trigger(OneSignal.EVENTS.SDK_INITIALIZED);
  await promise;

  t.is(isPromiseDone, true);
  t.is(databaseSpy.calledOnce, true);
  t.is(updateManagerSpy.calledOnce, true);
});

test("setExternalUserId - does not execute until user is registered with OneSignal", async t => {
  const awaitSdkEventSpy = sinonSandbox.stub(Utils, "awaitSdkEvent");
  sinonSandbox.stub(OneSignal.context.subscriptionManager, "isAlreadyRegisteredWithOneSignal").resolves(false);
  sinonSandbox.stub(OneSignalUtils, "logMethodCall").resolves();
  const databaseSpy = sinonSandbox.stub(OneSignal.database, "setExternalUserId").resolves();
  const updateManagerSpy = sinonSandbox.stub(OneSignal.context.updateManager, "sendExternalUserIdUpdate").resolves({
    success: true
  });

  let isPromiseDone = false;
  const promise = OneSignal.setExternalUserId(externalUserId).then(() => { isPromiseDone = true; });
  t.is(isPromiseDone, false);

  awaitSdkEventSpy.resolves();
  await promise;

  t.is(isPromiseDone, true);
  t.is(databaseSpy.calledOnce, true);
  t.is(updateManagerSpy.calledOnce, true);
});

test("setExternalUserId - performs the update if user is registered with OneSignal", async t => {
  sinonSandbox.stub(Utils, "awaitSdkEvent").resolves();
  sinon.stub(OneSignal.context.subscriptionManager, "isAlreadyRegisteredWithOneSignal").resolves(true);
  const databaseSpy = sinonSandbox.stub(OneSignal.database, "setExternalUserId").resolves();
  const updateManagerSpy = sinonSandbox.stub(OneSignal.context.updateManager, "sendExternalUserIdUpdate").resolves({
    success: true
  });

  await OneSignal.setExternalUserId(externalUserId);
  t.is(databaseSpy.calledOnce, true);
  t.is(updateManagerSpy.calledOnce, true);
});

test("setExternalUserId - throws error if auth hash is not formatted properly", async t => {
  sinonSandbox.stub(Utils, "awaitSdkEvent").resolves();
  sinon.stub(OneSignal.context.subscriptionManager, "isAlreadyRegisteredWithOneSignal").resolves(true);
  sinonSandbox.stub(OneSignal.database, "setExternalUserId").resolves();
  sinonSandbox.stub(OneSignal.context.updateManager, "sendExternalUserIdUpdate").resolves();
  await t.throwsAsync(
    async () => OneSignal.setExternalUserId(externalUserId, "badAuthCode"),
    { instanceOf: InvalidArgumentError }
  );
});

test("setExternalUserId - doesn't throw error if auth hash is formatted properly", async t => {
  sinonSandbox.stub(Utils, "awaitSdkEvent").resolves();
  sinon.stub(OneSignal.context.subscriptionManager, "isAlreadyRegisteredWithOneSignal").resolves(true);
  sinonSandbox.stub(OneSignal.database, "setExternalUserId").resolves();
  sinonSandbox.stub(OneSignal.context.updateManager, "sendExternalUserIdUpdate").resolves();
  await t.notThrows(
    async () => {
      OneSignal.setExternalUserId(externalUserId, "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
    }
  );
});

test("getExternalUserId - executes after OneSignal is fully initialized", async t => {
  (global as any).OneSignal.initialized = false;
  (global as any).OneSignal._initCalled = false;

  const databaseSpy = sinonSandbox.stub(OneSignal.database, "getExternalUserId").resolves();

  let isPromiseDone = false;
  const promise = OneSignal.getExternalUserId().then(() => { isPromiseDone = true; });
  t.is(isPromiseDone, false);

  Event.trigger(OneSignal.EVENTS.SDK_INITIALIZED);
  await promise;

  t.is(isPromiseDone, true);
  t.is(databaseSpy.calledOnce, true);
});

test("getExternalUserId - returns the value from the database", async t => {
  const databaseSpy = sinonSandbox.stub(OneSignal.database, "getExternalUserId").resolves();
  await OneSignal.getExternalUserId();
  t.is(databaseSpy.calledOnce, true);
});

test("removeExternalUserId - executes after OneSignal is fully initialized", async t => {
  (global as any).OneSignal.initialized = false;
  (global as any).OneSignal._initCalled = false;

  sinonSandbox.stub(OneSignal.context.subscriptionManager, "isAlreadyRegisteredWithOneSignal").resolves(true);
  const databaseSpy = sinonSandbox.stub(OneSignal.database, "setExternalUserId").resolves();
  const updateManagerSpy = sinonSandbox.stub(OneSignal.context.updateManager, "sendExternalUserIdUpdate").resolves({
    success: true
  });

  let isPromiseDone = false;
  const promise = OneSignal.removeExternalUserId().then(() => { isPromiseDone = true; });
  t.is(isPromiseDone, false);

  Event.trigger(OneSignal.EVENTS.SDK_INITIALIZED);
  await promise;

  t.is(isPromiseDone, true);
  t.is(databaseSpy.calledOnce, true);
  t.is(updateManagerSpy.calledOnce, true);
});

test("removeExternalUserId - does not try to remove external user id if not registered with OneSignal", async t => {
  sinonSandbox.stub(OneSignal.context.subscriptionManager, "isAlreadyRegisteredWithOneSignal").resolves(false);
  const databaseSpy = sinonSandbox.stub(OneSignal.database, "setExternalUserId").resolves();
  const updateManagerSpy = sinonSandbox.stub(OneSignal.context.updateManager, "sendExternalUserIdUpdate").resolves({
    success: true
  });

  await OneSignal.removeExternalUserId();
  t.is(databaseSpy.notCalled, true);
  t.is(updateManagerSpy.notCalled, true);
});

test("removeExternalUserId - removes the value", async t => {
  sinonSandbox.stub(OneSignal.context.subscriptionManager, "isAlreadyRegisteredWithOneSignal").resolves(true);
  const databaseSpy = sinonSandbox.stub(OneSignal.database, "setExternalUserId");
  const updateManagerSpy = sinonSandbox.stub(OneSignal.context.updateManager, "sendExternalUserIdUpdate").resolves({
    success: true
  });

  await OneSignal.removeExternalUserId();
  t.is(databaseSpy.calledOnce, true);
  t.is(updateManagerSpy.calledOnce, true);
});
