import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import {
  EmptyArgumentError,
  WrongTypeArgumentError,
} from 'src/shared/errors/common';
import Database from 'src/shared/services/Database';
import NotificationsNamespace from './NotificationsNamespace';

describe('NotificationsNamespace', () => {
  beforeEach(async () => {
    await TestEnvironment.initialize();
  });

  test('should set the default url', async () => {
    const notifications = new NotificationsNamespace();
    await notifications.setDefaultUrl('https://test.com');

    const appState = await Database.getAppState();
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

    const appState = await Database.getAppState();
    expect(appState.defaultNotificationTitle).toBe('My notification title');

    // @ts-expect-error - testing throwing invalid type
    await expect(notifications.setDefaultTitle(1)).rejects.toThrow(
      WrongTypeArgumentError('title'),
    );

    await expect(notifications.setDefaultTitle(undefined)).rejects.toThrow(
      EmptyArgumentError('title'),
    );
  });
});
