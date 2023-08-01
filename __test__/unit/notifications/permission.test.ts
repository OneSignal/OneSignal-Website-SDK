import ModelCache from "../../../src/core/caching/ModelCache";
import { NotificationPermission } from "../../../src/shared/models/NotificationPermission";
import { TestEnvironment } from "../../support/environment/TestEnvironment";
import { PermissionManager } from "../../support/managers/PermissionManager";

describe('Notifications namespace permission properties', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    test.stub(ModelCache.prototype, 'load', Promise.resolve({}));
    TestEnvironment.initialize();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('When permission changes to granted, we update the permission properties on the Notifications namespace', async () => {
    await PermissionManager.mockNotificationPermissionChange(test, NotificationPermission.Granted);

    expect(OneSignal.Notifications.permission).toBe(true);
    expect(OneSignal.Notifications.permissionNative).toBe(NotificationPermission.Granted);
  });

  test('When permission changes to default, we update the permission properties on the Notifications namespace', async () => {
    await PermissionManager.mockNotificationPermissionChange(test, NotificationPermission.Default);

    expect(OneSignal.Notifications.permission).toBe(false);
    expect(OneSignal.Notifications.permissionNative).toBe(NotificationPermission.Default);
  });

  test('When permission changes to denied, we update the permission properties on the Notifications namespace', async () => {
    await PermissionManager.mockNotificationPermissionChange(test, NotificationPermission.Denied);

    expect(OneSignal.Notifications.permission).toBe(false);
    expect(OneSignal.Notifications.permissionNative).toBe(NotificationPermission.Denied);
  });
});
