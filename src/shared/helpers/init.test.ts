import { APP_ID } from '__test__/constants';
import TestContext from '__test__/support/environment/TestContext';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { setupSubModelStore } from '__test__/support/environment/TestEnvironmentHelpers';
import Context from 'src/page/models/Context';
import { type AppConfig } from 'src/shared/config/types';
import { beforeEach, describe, expect, test, vi, type MockInstance } from 'vite-plus/test';

import { db } from '../database/client';
import { getAppState } from '../database/config';
import * as InitHelper from './init';

let isSubscriptionExpiringSpy: MockInstance;

beforeEach(() => {
  TestEnvironment.initialize();
  isSubscriptionExpiringSpy = vi.spyOn(
    OneSignal._context._subscriptionManager,
    '_isSubscriptionExpiring',
  );
});

/** onSdkInitialized */
test('onSdkInitialized: ensure public sdk initialized triggered', async () => {
  OneSignal._emitter.on(OneSignal.EVENTS.SDK_INITIALIZED_PUBLIC, () => {
    expect(true).toBe(true);
  });
  await InitHelper.onSdkInitialized();
  expect.assertions(1);
});

test('onSdkInitialized: processes expiring subscriptions', async () => {
  await InitHelper.onSdkInitialized();
  expect(isSubscriptionExpiringSpy).toHaveBeenCalledTimes(1);
});

test('onSdkInitialized: sends on session update only if both autoPrompt and autoResubscribe are false', async () => {
  const spy = vi
    .spyOn(OneSignal._context._updateManager, '_sendOnSessionUpdate')
    .mockResolvedValue();

  OneSignal.config!.userConfig.promptOptions!.autoPrompt = false;
  OneSignal.config!.userConfig.autoResubscribe = false;

  await InitHelper.onSdkInitialized();

  expect(spy).toHaveBeenCalledTimes(1);
});

test('onSdkInitialized: does not send on session update', async () => {
  const spy = vi
    .spyOn(OneSignal._context._updateManager, '_sendOnSessionUpdate')
    .mockResolvedValue();

  OneSignal.config!.userConfig.promptOptions!.autoPrompt = true;
  OneSignal.config!.userConfig.autoResubscribe = true;

  await InitHelper.onSdkInitialized();

  expect(spy).not.toHaveBeenCalled();

  OneSignal.config!.userConfig.promptOptions!.autoPrompt = false;
  OneSignal.config!.userConfig.autoResubscribe = true;

  await InitHelper.onSdkInitialized();

  expect(spy).not.toHaveBeenCalled();

  OneSignal.config!.userConfig.promptOptions!.autoPrompt = true;
  OneSignal.config!.userConfig.autoResubscribe = false;

  await InitHelper.onSdkInitialized();

  expect(spy).not.toHaveBeenCalled();
});

test('correct degree of persistNotification setting should be stored', async () => {
  TestEnvironment.initialize();

  const appConfig = TestContext.getFakeMergedConfig();
  OneSignal._context = new Context(appConfig);
  OneSignal.config = appConfig;
  const config: AppConfig = OneSignal.config;

  // If not set, default to true
  delete config.userConfig.persistNotification;
  await InitHelper.saveInitOptions();
  let persistNotification = (await db.get('Options', 'persistNotification'))?.value;
  expect(persistNotification).toBe(true);

  // If set to false, ensure value is false
  config.userConfig.persistNotification = false;
  await InitHelper.saveInitOptions();
  persistNotification = (await db.get('Options', 'persistNotification'))?.value;
  expect(persistNotification).toBe(false);

  // If set to true, ensure value is true
  config.userConfig.persistNotification = true;
  await InitHelper.saveInitOptions();
  persistNotification = (await db.get('Options', 'persistNotification'))?.value;
  expect(persistNotification).toBe(true);
});

/** initSaveState – App ID migration */
describe('initSaveState: App ID migration', () => {
  const OLD_APP_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const NEW_APP_ID = APP_ID; // the default test app id used in TestEnvironment

  async function seedStaleState() {
    await db.put('Ids', { type: 'appId', id: OLD_APP_ID });
    await db.put('Options', { key: 'isPushEnabled', value: true });
    await db.put('Options', { key: 'lastPushId', value: 'old-push-id' });
    await db.put('Options', {
      key: 'lastPushToken',
      value: 'old-push-token',
    });
    await db.put('Options', { key: 'lastOptedIn', value: true });
    await db.put('Ids', { type: 'registrationId', id: 'old-reg-token' });
  }

  test('clears stale lastKnown* values when App ID changes', async () => {
    await seedStaleState();

    await InitHelper.initSaveState();

    const appState = await getAppState();
    expect(appState.lastKnownPushEnabled).toBeNull();
    expect(appState.lastKnownPushId).toBeUndefined();
    expect(appState.lastKnownPushToken).toBeUndefined();
    expect(appState.lastKnownOptedIn).toBeNull();
  });

  test('clears subscription models when App ID changes', async () => {
    await setupSubModelStore({ id: 'old-sub-id', token: 'old-token' });
    expect(OneSignal._coreDirector._subscriptionModelStore._list().length).toBeGreaterThan(0);

    await seedStaleState();
    await InitHelper.initSaveState();

    expect(OneSignal._coreDirector._subscriptionModelStore._list()).toHaveLength(0);
  });

  test('clears stale registrationId and deviceId when App ID changes', async () => {
    await seedStaleState();
    await db.put('Ids', { type: 'userId', id: 'old-device-id' });

    await InitHelper.initSaveState();

    const regId = await db.get('Ids', 'registrationId');
    expect(regId?.id).toBeNull();
    const userId = await db.get('Ids', 'userId');
    expect(userId?.id).toBeNull();
  });

  test('saves the new App ID after migration', async () => {
    await seedStaleState();

    await InitHelper.initSaveState();

    const storedAppId = await db.get('Ids', 'appId');
    expect(storedAppId?.id).toBe(NEW_APP_ID);
  });

  test('does NOT clear state when App ID has not changed', async () => {
    await db.put('Ids', { type: 'appId', id: NEW_APP_ID });
    await db.put('Options', { key: 'isPushEnabled', value: true });
    await db.put('Options', { key: 'lastPushId', value: 'current-id' });
    await db.put('Options', {
      key: 'lastPushToken',
      value: 'current-token',
    });
    await db.put('Options', { key: 'lastOptedIn', value: true });

    await InitHelper.initSaveState();

    const appState = await getAppState();
    expect(appState.lastKnownPushEnabled).toBe(true);
    expect(appState.lastKnownPushId).toBe('current-id');
    expect(appState.lastKnownPushToken).toBe('current-token');
    expect(appState.lastKnownOptedIn).toBe(true);
  });

  test('does NOT clear state on first-ever initialization (no previous App ID)', async () => {
    await db.put('Options', { key: 'isPushEnabled', value: true });

    await InitHelper.initSaveState();

    const appState = await getAppState();
    expect(appState.lastKnownPushEnabled).toBe(true);

    const storedAppId = await db.get('Ids', 'appId');
    expect(storedAppId?.id).toBe(NEW_APP_ID);
  });
});
