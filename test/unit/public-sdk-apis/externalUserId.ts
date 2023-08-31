import test from 'ava';
import sinon, { SinonSandbox } from 'sinon';
import OneSignalEvent from '../../../src/shared/services/OneSignalEvent';
import OneSignalUtils from '../../../src/shared/utils/OneSignalUtils';
import { TestEnvironment } from '../../support/sdk/TestEnvironment';
import * as Utils from '../../../src/shared/utils/utils';
import { InvalidArgumentError } from '../../../src/shared/errors/InvalidArgumentError';
import OneSignalApiShared from '../../../src/shared/api/OneSignalApiShared';

const sinonSandbox: SinonSandbox = sinon.sandbox.create();
const externalUserId = 'external_email@example.com';

test.beforeEach(async () => {
  await TestEnvironment.initialize();
  TestEnvironment.mockInternalOneSignal();
});

test.afterEach(() => {
  sinonSandbox.restore();
});

test('setExternalUserId - executes after OneSignal is fully initialized', async (t) => {
  (global as any).OneSignal.initialized = false;
  (global as any).OneSignal._initCalled = false;

  sinonSandbox
    .stub(
      OneSignal.context.subscriptionManager,
      'isAlreadyRegisteredWithOneSignal',
    )
    .resolves(true);
  const databaseSpy = sinonSandbox
    .stub(OneSignal.database, 'setExternalUserId')
    .resolves();
  const updateManagerSpy = sinonSandbox
    .stub(OneSignal.context.updateManager, 'sendExternalUserIdUpdate')
    .resolves({
      success: true,
    });

  let isPromiseDone = false;
  const promise = OneSignal.setExternalUserId(externalUserId).then(() => {
    isPromiseDone = true;
  });
  t.is(isPromiseDone, false);

  OneSignalEvent.trigger(OneSignal.EVENTS.SDK_INITIALIZED);
  await promise;

  t.is(isPromiseDone, true);
  t.is(databaseSpy.calledOnce, true);
  t.is(updateManagerSpy.calledOnce, true);
});

test('setExternalUserId - saves external user id to DB before awaiting for push registration', async (t) => {
  const awaitSdkEventSpy = sinonSandbox.stub(Utils, 'awaitSdkEvent');
  sinonSandbox
    .stub(
      OneSignal.context.subscriptionManager,
      'isAlreadyRegisteredWithOneSignal',
    )
    .resolves(false);
  const databaseSpy = sinonSandbox
    .stub(OneSignal.database, 'setExternalUserId')
    .resolves();
  sinonSandbox
    .stub(OneSignal.context.updateManager, 'sendExternalUserIdUpdate')
    .resolves({
      success: true,
    });

  const promise = (OneSignal as any).privateSetExternalUserId(externalUserId);
  t.is(databaseSpy.calledOnce, true);

  awaitSdkEventSpy.resolves();
  await promise;
});

test('setExternalUserId - does not execute until user is registered with OneSignal', async (t) => {
  const awaitSdkEventSpy = sinonSandbox.stub(Utils, 'awaitSdkEvent');
  sinonSandbox
    .stub(
      OneSignal.context.subscriptionManager,
      'isAlreadyRegisteredWithOneSignal',
    )
    .resolves(false);
  sinonSandbox.stub(OneSignalUtils, 'logMethodCall').resolves();
  const databaseSpy = sinonSandbox
    .stub(OneSignal.database, 'setExternalUserId')
    .resolves();
  const updateManagerSpy = sinonSandbox
    .stub(OneSignal.context.updateManager, 'sendExternalUserIdUpdate')
    .resolves({
      success: true,
    });

  let isPromiseDone = false;
  const promise = OneSignal.setExternalUserId(externalUserId).then(() => {
    isPromiseDone = true;
  });
  t.is(isPromiseDone, false);

  awaitSdkEventSpy.resolves();
  await promise;

  t.is(isPromiseDone, true);
  t.is(databaseSpy.calledOnce, true);
  t.is(updateManagerSpy.calledOnce, true);
});

test('setExternalUserId - performs the update if user is registered with OneSignal', async (t) => {
  sinonSandbox.stub(Utils, 'awaitSdkEvent').resolves();
  sinon
    .stub(
      OneSignal.context.subscriptionManager,
      'isAlreadyRegisteredWithOneSignal',
    )
    .resolves(true);
  const databaseSpy = sinonSandbox
    .stub(OneSignal.database, 'setExternalUserId')
    .resolves();
  const updateManagerSpy = sinonSandbox
    .stub(OneSignal.context.updateManager, 'sendExternalUserIdUpdate')
    .resolves({
      success: true,
    });

  await OneSignal.setExternalUserId(externalUserId);
  t.is(databaseSpy.calledOnce, true);
  t.is(updateManagerSpy.calledOnce, true);
});

test('setExternalUserId - throws error if auth hash is not formatted properly', async (t) => {
  sinonSandbox.stub(Utils, 'awaitSdkEvent').resolves();
  sinon
    .stub(
      OneSignal.context.subscriptionManager,
      'isAlreadyRegisteredWithOneSignal',
    )
    .resolves(true);
  sinonSandbox.stub(OneSignal.database, 'setExternalUserId').resolves();
  sinonSandbox
    .stub(OneSignal.context.updateManager, 'sendExternalUserIdUpdate')
    .resolves();
  await t.throwsAsync(
    async () => OneSignal.setExternalUserId(externalUserId, 'badAuthCode'),
    { instanceOf: InvalidArgumentError },
  );
});

test("setExternalUserId - doesn't throw error if auth hash is formatted properly", async (t) => {
  sinonSandbox.stub(Utils, 'awaitSdkEvent').resolves();
  sinon
    .stub(
      OneSignal.context.subscriptionManager,
      'isAlreadyRegisteredWithOneSignal',
    )
    .resolves(true);
  sinonSandbox.stub(OneSignal.database, 'setExternalUserId').resolves();
  sinonSandbox
    .stub(OneSignal.context.updateManager, 'sendExternalUserIdUpdate')
    .resolves();
  await t.notThrows(async () => {
    OneSignal.setExternalUserId(
      externalUserId,
      'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    );
  });
});

test('getExternalUserId - executes after OneSignal is fully initialized', async (t) => {
  (global as any).OneSignal.initialized = false;
  (global as any).OneSignal._initCalled = false;

  const databaseSpy = sinonSandbox
    .stub(OneSignal.database, 'getExternalUserId')
    .resolves();

  let isPromiseDone = false;
  const promise = OneSignal.getExternalUserId().then(() => {
    isPromiseDone = true;
  });
  t.is(isPromiseDone, false);

  OneSignalEvent.trigger(OneSignal.EVENTS.SDK_INITIALIZED);
  await promise;

  t.is(isPromiseDone, true);
  t.is(databaseSpy.calledOnce, true);
});

test('getExternalUserId - returns the value from the database', async (t) => {
  const databaseSpy = sinonSandbox
    .stub(OneSignal.database, 'getExternalUserId')
    .resolves();
  await OneSignal.getExternalUserId();
  t.is(databaseSpy.calledOnce, true);
});

test('removeExternalUserId - executes after OneSignal is fully initialized', async (t) => {
  (global as any).OneSignal.initialized = false;
  (global as any).OneSignal._initCalled = false;

  sinonSandbox
    .stub(
      OneSignal.context.subscriptionManager,
      'isAlreadyRegisteredWithOneSignal',
    )
    .resolves(true);
  const databaseSpy = sinonSandbox
    .stub(OneSignal.database, 'setExternalUserId')
    .resolves();
  const updateManagerSpy = sinonSandbox
    .stub(OneSignal.context.updateManager, 'sendExternalUserIdUpdate')
    .resolves({
      success: true,
    });

  let isPromiseDone = false;
  const promise = OneSignal.removeExternalUserId().then(() => {
    isPromiseDone = true;
  });
  t.is(isPromiseDone, false);

  OneSignalEvent.trigger(OneSignal.EVENTS.SDK_INITIALIZED);
  await promise;

  t.is(isPromiseDone, true);
  t.is(databaseSpy.calledOnce, true);
  t.is(updateManagerSpy.calledOnce, true);
});

test('removeExternalUserId - removes value from local db, before checking if registered with OneSignal', async (t) => {
  sinonSandbox
    .stub(
      OneSignal.context.subscriptionManager,
      'isAlreadyRegisteredWithOneSignal',
    )
    .resolves(false);
  const databaseSpy = sinonSandbox
    .stub(OneSignal.database, 'setExternalUserId')
    .resolves();
  const updatePlayerSpy = sinonSandbox.stub(OneSignalApiShared, 'updatePlayer');

  // Call public method, we need to catch due to the short circuit note above.
  await OneSignal.removeExternalUserId();

  // Ensure we saved the value to DB to clear it.
  t.true(databaseSpy.called);
  // Ensure we didn't try to make a REST call if the player is not registered.
  t.false(updatePlayerSpy.called);
});

test('removeExternalUserId - removes the value', async (t) => {
  sinonSandbox
    .stub(
      OneSignal.context.subscriptionManager,
      'isAlreadyRegisteredWithOneSignal',
    )
    .resolves(true);
  const databaseSpy = sinonSandbox.stub(
    OneSignal.database,
    'setExternalUserId',
  );
  const updateManagerSpy = sinonSandbox
    .stub(OneSignal.context.updateManager, 'sendExternalUserIdUpdate')
    .resolves({
      success: true,
    });

  await OneSignal.removeExternalUserId();
  t.is(databaseSpy.calledOnce, true);
  t.is(updateManagerSpy.calledOnce, true);
});
