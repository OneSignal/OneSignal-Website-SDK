import TestContext from '__test__/support/environment/TestContext';
import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import Context from 'src/page/models/Context';
import { type AppConfig } from 'src/shared/config/types';
import type { MockInstance } from 'vitest';
import { db } from '../database/client';
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
  OneSignal._emitter.on('initialize', () => {
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
  let persistNotification = (await db.get('Options', 'persistNotification'))
    ?.value;
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
