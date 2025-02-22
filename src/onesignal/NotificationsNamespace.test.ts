import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import Database from 'src/shared/services/Database';
import NotificationsNamespace from './NotificationsNamespace';
import { InvalidArgumentError } from 'src/shared/errors/InvalidArgumentError';
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
      InvalidArgumentError,
    );

    // @ts-expect-error - testing throwing invalid type
    await expect(notifications.setDefaultUrl(1)).rejects.toThrow(
      InvalidArgumentError,
    );
  });

  test('should set the default title', async () => {
    const notifications = new NotificationsNamespace();
    await notifications.setDefaultTitle('My notification title');

    const appState = await Database.getAppState();
    expect(appState.defaultNotificationTitle).toBe('My notification title');

    // @ts-expect-error - testing throwing invalid type
    await expect(notifications.setDefaultTitle(1)).rejects.toThrow(
      InvalidArgumentError,
    );

    await expect(notifications.setDefaultTitle(undefined)).rejects.toThrow(
      InvalidArgumentError,
    );
  });
});
