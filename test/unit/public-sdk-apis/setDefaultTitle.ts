import '../../support/polyfills/polyfills';
import test from 'ava';
import Database from '../../../src/shared/services/Database';
import { TestEnvironment } from '../../support/sdk/TestEnvironment';
import OneSignal from '../../../src/onesignal/OneSignal';

test('title can be null', async (t) => {
  await TestEnvironment.initialize();
  await OneSignal.Notifications.setDefaultTitle(null);
  const appState = await Database.getAppState();
  t.is(appState.defaultNotificationTitle, null);
});

test('title can be empty', async (t) => {
  await TestEnvironment.initialize();
  await OneSignal.Notifications.setDefaultTitle('');
  const appState = await Database.getAppState();
  t.is(appState.defaultNotificationTitle, '');
});

test('title can be some text', async (t) => {
  await TestEnvironment.initialize();
  await OneSignal.Notifications.setDefaultTitle('My notification title');
  const appState = await Database.getAppState();
  t.is(appState.defaultNotificationTitle, 'My notification title');
});
