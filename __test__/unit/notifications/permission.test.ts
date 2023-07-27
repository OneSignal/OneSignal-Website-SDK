import ModelCache from "../../../src/core/caching/ModelCache";
import PermissionManager from "../../../src/shared/managers/PermissionManager";
import { PermissionUtils } from "../../../src/shared/utils/PermissionUtils";
import { NotificationPermission } from "../../../src/shared/models/NotificationPermission";
import { TestEnvironment } from "../../support/environment/TestEnvironment";

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
    test.stub(PermissionManager.prototype, 'getPermissionStatus', Promise.resolve(NotificationPermission.Granted));
    const permissionChangeEventFiredPromise = new Promise(resolve => {
      OneSignal.emitter.on(OneSignal.EVENTS.NATIVE_PROMPT_PERMISSIONCHANGED, resolve);
    });

    // mimick native permission change
    PermissionUtils.triggerNotificationPermissionChanged();

    await permissionChangeEventFiredPromise
    expect(OneSignal.Notifications.permission).toBe(true);
    expect(OneSignal.Notifications.permissionNative).toBe(NotificationPermission.Granted);
  });

  test('When permission changes to default, we update the permission properties on the Notifications namespace', async () => {
    test.stub(PermissionManager.prototype, 'getPermissionStatus', Promise.resolve(NotificationPermission.Default));
    const permissionChangeEventFiredPromise = new Promise(resolve => {
      OneSignal.emitter.on(OneSignal.EVENTS.NATIVE_PROMPT_PERMISSIONCHANGED, resolve);
    });

    // mimick native permission change
    PermissionUtils.triggerNotificationPermissionChanged();

    await permissionChangeEventFiredPromise
    expect(OneSignal.Notifications.permission).toBe(false);
    expect(OneSignal.Notifications.permissionNative).toBe(NotificationPermission.Default);
  });

  test('When permission changes to denied, we update the permission properties on the Notifications namespace', async () => {
    test.stub(PermissionManager.prototype, 'getPermissionStatus', Promise.resolve(NotificationPermission.Denied));
    const permissionChangeEventFiredPromise = new Promise(resolve => {
      OneSignal.emitter.on(OneSignal.EVENTS.NATIVE_PROMPT_PERMISSIONCHANGED, resolve);
    });

    // mimick native permission change
    PermissionUtils.triggerNotificationPermissionChanged();

    await permissionChangeEventFiredPromise
    expect(OneSignal.Notifications.permission).toBe(false);
    expect(OneSignal.Notifications.permissionNative).toBe(NotificationPermission.Denied);
  });
});
