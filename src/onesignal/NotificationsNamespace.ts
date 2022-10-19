import EventHelper from "../shared/helpers/EventHelper";
import MainHelper from "../shared/helpers/MainHelper";
import Log from "../shared/libraries/Log";
import { UpdatePlayerOptions } from "../shared/models/UpdatePlayerOptions";
import { NotificationActionButton } from "../page/models/NotificationActionButton";
import { ValidatorUtils } from "../page/utils/ValidatorUtils";
import OneSignalApi from "../shared/api/OneSignalApi";
import { InvalidArgumentError, InvalidArgumentReason } from "../shared/errors/InvalidArgumentError";
import { InvalidStateError, InvalidStateReason } from "../shared/errors/InvalidStateError";
import { NotSubscribedError, NotSubscribedReason } from "../shared/errors/NotSubscribedError";
import Database from "../shared/services/Database";
import { awaitOneSignalInitAndSupported, logMethodCall, executeCallback } from "../shared/utils/utils";
import OneSignalError from "../../src/shared/errors/OneSignalError";
import OneSignal from "./OneSignal";

export default class NotificationsNamespace {
  /**
   * Pass in the full URL of the default page you want to open when a notification is clicked.
   * @PublicApi
   */
  async setDefaultUrl(url: string) {
    if (!ValidatorUtils.isValidUrl(url, { allowNull: true }))
      throw new InvalidArgumentError('url', InvalidArgumentReason.Malformed);
    await awaitOneSignalInitAndSupported();
    logMethodCall('setDefaultNotificationUrl', url);
    const appState = await Database.getAppState();
    appState.defaultNotificationUrl = url;
    await Database.setAppState(appState);
  }

  /**
   * Sets the default title to display on notifications. Will default to the site name provided
   * on the dashboard if you don't call this.
   * @remarks Either DB value defaultTitle or pageTitle is used when showing a notification title.
   * @PublicApi
   */
  async setDefaultTitle(title: string) {
    await awaitOneSignalInitAndSupported();
    logMethodCall('setDefaultTitle', title);
    const appState = await Database.getAppState();
    appState.defaultNotificationTitle = title;
    await Database.setAppState(appState);
  }


  /**
   * Returns true if the current browser supports web push.
   * @PublicApi
   */
  isPushSupported(): boolean {
    logMethodCall('isPushNotificationsSupported');
    /*
      Push notification support is checked in the initial entry code. If in an unsupported environment, a stubbed empty
      version of the SDK will be loaded instead. This file will only be loaded if push notifications are supported.
     */
    return true;
  }

  /**
   * @PublicApi
   */
  async sendSelfPush(title: string = 'OneSignal Test Message',
                              message: string = 'This is an example notification.',
                              url: string = `${new URL(location.href).origin}?_osp=do_not_open`,
                              icon: URL,
                              data: Map<String, any>,
                              buttons: Array<NotificationActionButton>): Promise<void> {
    await awaitOneSignalInitAndSupported();
    logMethodCall('sendSelfNotification', title, message, url, icon, data, buttons);
    const appConfig = await Database.getAppConfig();
    const subscription = await Database.getSubscription();
    if (!appConfig.appId)
      throw new InvalidStateError(InvalidStateReason.MissingAppId);
    if (!(await OneSignal.context.subscriptionManager.isPushNotificationsEnabled()))
      throw new NotSubscribedError(NotSubscribedReason.NoDeviceId);
    if (!ValidatorUtils.isValidUrl(url))
      throw new InvalidArgumentError('url', InvalidArgumentReason.Malformed);
    if (!ValidatorUtils.isValidUrl(icon, { allowEmpty: true, requireHttps: true }))
      throw new InvalidArgumentError('icon', InvalidArgumentReason.Malformed);

    if (subscription.deviceId) {
      await OneSignalApi.sendNotification(appConfig.appId, [subscription.deviceId], { en : title }, { en : message },
                                               url, icon, data, buttons);
    }
  }

  /**
   * @PublicApi
   */
  async isOptedOut(callback?: Action<boolean | undefined | null>):
    Promise<boolean | undefined | null> {
    logMethodCall('isOptedOut', callback);
    const { optedOut } = await Database.getSubscription();
    executeCallback(callback, optedOut);
    return optedOut;
  }

  /**
   * Returns a promise that resolves to the browser's current notification permission as
   *    'default', 'granted', or 'denied'.
   * @param callback A callback function that will be called when the browser's current notification permission
   *           has been obtained, with one of 'default', 'granted', or 'denied'.
   * @PublicApi
   */
  async getPermissionStatus(onComplete?: Action<NotificationPermission>): Promise<NotificationPermission> {
    if (!OneSignal.context) {
      throw new OneSignalError(`OneSignal.context is undefined. Make sure to call OneSignal.init() before calling getPermissionStatus().`);
    }

    const permission = await OneSignal.context.permissionManager.getNotificationPermission(
        OneSignal.config!.safariWebId
      );

    if (onComplete)
      onComplete(permission);

    return permission;
  }

  /**
   * @PublicApi
   */
  async disable(disabled: boolean): Promise<void> {
    await awaitOneSignalInitAndSupported();
    logMethodCall('disable', disabled);
    const appConfig = await Database.getAppConfig();
    const { appId } = appConfig;
    const subscription = await Database.getSubscription();
    const { deviceId } = subscription;
    if (!appConfig.appId)
      throw new InvalidStateError(InvalidStateReason.MissingAppId);
    if (!ValidatorUtils.isValidBoolean(disabled))
      throw new InvalidArgumentError('disabled', InvalidArgumentReason.Malformed);
    if (!deviceId) {
      // TODO: Throw an error here in future v2; for now it may break existing client implementations.
      Log.info(new NotSubscribedError(NotSubscribedReason.NoDeviceId));
      return;
    }
    const options : UpdatePlayerOptions = {
      notification_types: MainHelper.getNotificationTypeFromOptIn(!disabled)
    };

    const authHash = await Database.getExternalUserIdAuthHash();
    if (!!authHash) {
      options.external_user_id_auth_hash = authHash;
    }

    subscription.optedOut = disabled;
    await OneSignalApi.updatePlayer(appId, deviceId, options);
    await Database.setSubscription(subscription);
    EventHelper.onInternalSubscriptionSet(subscription.optedOut).catch(e => {
      Log.error(e);
    });
    EventHelper.checkAndTriggerSubscriptionChanged().catch(e => {
      Log.error(e);
    });
  }

  /**
   * Shows a native browser prompt.
   * @PublicApi
   */
   async requestPermission(): Promise<void> {
    await awaitOneSignalInitAndSupported();
    await OneSignal.context.promptsManager.internalShowNativePrompt();
  }
}
