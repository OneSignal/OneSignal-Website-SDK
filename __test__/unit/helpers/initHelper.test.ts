import OneSignalUtils from "../../../src/shared/utils/OneSignalUtils";
import InitHelper from "../../../src/shared/helpers/InitHelper";
import { TestEnvironment } from "../../support/environment/TestEnvironment";
import { MessageChannel } from "worker_threads";
import { SubscriptionManager } from "../../../src/shared/managers/SubscriptionManager";
import PermissionManager from "../../../src/shared/managers/PermissionManager";

describe('InitHelper', () => {
  beforeEach(async () => {
    await TestEnvironment.initialize();
    (global as any).MessageChannel = MessageChannel;
    // temporary: remove when we fix default environment being Safari
    test.stub(SubscriptionManager, 'isSafari', false);
    test.stub(PermissionManager, 'getSafariNotificationPermission', Promise.resolve('granted'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /** registerForPushNotifications */
  test('registerForPushNotifications: requesting a modal prompt', async () => {
    await InitHelper.registerForPushNotifications({ modalPrompt: true });

    expect(OneSignal.subscriptionModalHost).not.toBeUndefined();
    expect(OneSignal.subscriptionModalHost.modal).not.toBeUndefined();
  });

  test('registerForPushNotifications: load fullscreen popup when using subscription workaround', async () => {
    const utilsStub = jest.spyOn(OneSignalUtils, 'isUsingSubscriptionWorkaround').mockReturnValue(true);
    const loadStub = jest.spyOn(InitHelper, 'loadSubscriptionPopup').mockResolvedValue(undefined);

    await InitHelper.registerForPushNotifications();

    expect(utilsStub).toHaveBeenCalledTimes(1);
    expect(loadStub).toHaveBeenCalledTimes(1);
  });

  /** onSdkInitialized */
  test("onSdkInitialized: ensure public sdk initialized triggered", async () => {
    OneSignal.emitter.on(OneSignal.EVENTS.SDK_INITIALIZED_PUBLIC, () => {
      expect(true).toBe(true);
    });
    await InitHelper.onSdkInitialized();
    expect.assertions(1);
  });

  test("onSdkInitialized: processes expiring subscriptions", async () => {
    const spy = test.stub(InitHelper, "processExpiringSubscriptions", Promise.resolve(undefined));
    await InitHelper.onSdkInitialized();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test("onSdkInitialized: sends on session update only if both autoPrompt and autoResubscribe are false", async () => {
    const spy = jest.spyOn(OneSignal.context.updateManager, "sendOnSessionUpdate").mockResolvedValue(undefined);
    test.stub(OneSignalUtils, "isUsingSubscriptionWorkaround", Promise.resolve(false));

    OneSignal.config.userConfig.promptOptions.autoPrompt = false;
    OneSignal.config.userConfig.autoResubscribe = false;

    await InitHelper.onSdkInitialized();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  test("onSdkInitialized: does not send on session update", async () => {
    const spy = jest.spyOn(OneSignal.context.updateManager, "sendOnSessionUpdate").mockResolvedValue(undefined);
    test.stub(OneSignalUtils, "isUsingSubscriptionWorkaround", Promise.resolve(false));

    OneSignal.config.userConfig.promptOptions.autoPrompt = true;
    OneSignal.config.userConfig.autoResubscribe = true;

    await InitHelper.onSdkInitialized();

    expect(spy).not.toHaveBeenCalled();

    OneSignal.config.userConfig.promptOptions.autoPrompt = false;
    OneSignal.config.userConfig.autoResubscribe = true;

    await InitHelper.onSdkInitialized();

    expect(spy).not.toHaveBeenCalled();

    OneSignal.config.userConfig.promptOptions.autoPrompt = true;
    OneSignal.config.userConfig.autoResubscribe = false;

    await InitHelper.onSdkInitialized();

    expect(spy).not.toHaveBeenCalled();
  });
});
