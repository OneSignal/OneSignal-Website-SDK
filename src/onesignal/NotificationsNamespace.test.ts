import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import { getAppState } from 'src/shared/database/config';
import {
  EmptyArgumentError,
  WrongTypeArgumentError,
} from 'src/shared/errors/common';
import Log from 'src/shared/libraries/Log';
import * as utils from 'src/shared/utils/utils';
import NotificationsNamespace from './NotificationsNamespace';

beforeEach(() => {
  TestEnvironment.initialize();
});

test('should set the default url', async () => {
  const notifications = new NotificationsNamespace();
  await notifications.setDefaultUrl('https://test.com');

  const appState = await getAppState();
  expect(appState.defaultNotificationUrl).toBe('https://test.com');

  await expect(notifications.setDefaultUrl(undefined)).rejects.toThrow(
    EmptyArgumentError('url'),
  );

  // @ts-expect-error - testing throwing invalid type
  await expect(notifications.setDefaultUrl(1)).rejects.toThrow(
    WrongTypeArgumentError('url'),
  );
});

test('should set the default title', async () => {
  const notifications = new NotificationsNamespace();
  await notifications.setDefaultTitle('My notification title');

  const appState = await getAppState();
  expect(appState.defaultNotificationTitle).toBe('My notification title');

  // @ts-expect-error - testing throwing invalid type
  await expect(notifications.setDefaultTitle(1)).rejects.toThrow(
    WrongTypeArgumentError('title'),
  );

  await expect(notifications.setDefaultTitle(undefined)).rejects.toThrow(
    EmptyArgumentError('title'),
  );
});

const warnSpy = vi.spyOn(Log, '_warn');
describe('Consent Required', () => {
  beforeEach(() => {
    OneSignal.setConsentRequired(true);
    TestEnvironment.initialize();
  });

  test('should not show native prompt if consent is required but not given', async () => {
    const initAndSupportedSpy = vi.spyOn(
      utils,
      'awaitOneSignalInitAndSupported',
    );
    const notifications = new NotificationsNamespace();
    await notifications.requestPermission();
    expect(warnSpy).toHaveBeenCalledWith('Consent required but not given');
    expect(initAndSupportedSpy).not.toHaveBeenCalled();
  });
});
