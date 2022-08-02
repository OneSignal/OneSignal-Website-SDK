import Context from "../../page/models/Context";
import { NotificationActionButton } from "../../page/models/NotificationActionButton";
import { isPushNotificationsSupported } from "../../page/utils/BrowserSupportsPush";
import { ValidatorUtils } from "../../page/utils/ValidatorUtils";
import OneSignalApi from "../../shared/api/OneSignalApi";
import { InvalidArgumentError, InvalidArgumentReason } from "../../shared/errors/InvalidArgumentError";
import { InvalidStateError, InvalidStateReason } from "../../shared/errors/InvalidStateError";
import { NotSubscribedError, NotSubscribedReason } from "../../shared/errors/NotSubscribedError";
import EventHelper from "../../shared/helpers/EventHelper";
import Database from "../../shared/services/Database";
import { awaitOneSignalInitAndSupported } from "../../shared/utils/utils";
import { isPushNotificationsEnabled } from "./helpers";

type NotificationEventObject = any;

export class NotificationsNamespace {
  constructor(private context: Context) {}

  public async getPermissionStatus(): Promise<NotificationPermission> {
    await awaitOneSignalInitAndSupported();
    return await this.context.permissionManager.getNotificationPermission(this.context.appConfig.safariWebId);
  }

  public async setDefaultUrl(url: string): Promise<void> {
    await awaitOneSignalInitAndSupported();
    if (!ValidatorUtils.isValidUrl(url, { allowNull: true })) {
      throw new InvalidArgumentError('url', InvalidArgumentReason.Malformed);
    }
    const appState = await Database.getAppState();
    appState.defaultNotificationUrl = url;
    await Database.setAppState(appState);
  }

  public async setDefaultTitle(title: string): Promise<void> {
    await awaitOneSignalInitAndSupported();
    const appState = await Database.getAppState();
    appState.defaultNotificationTitle = title;
    await Database.setAppState(appState);

  }

  public async requestPermission(): Promise<void> {
    await awaitOneSignalInitAndSupported();
    await this.context.promptsManager.internalShowNativePrompt();
  }

  public async isPushSupported(): Promise<boolean> {
    return isPushNotificationsSupported();
  }

  public async sendSelfPush(
    title: string,
    message: string,
    url: string,
    icon: URL,
    data: Map<String, any>,
    buttons: Array<NotificationActionButton>
  ): Promise<void> {
    await awaitOneSignalInitAndSupported();
    const appConfig = await Database.getAppConfig();
    const subscription = await Database.getSubscription();

    if (!appConfig.appId)
      throw new InvalidStateError(InvalidStateReason.MissingAppId);
    if (!(await isPushNotificationsEnabled()))
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

  public async disable(isDisabled: boolean): Promise<void> {
    const subscription = await Database.getSubscription();
    subscription.optedOut = isDisabled;
    await Database.setSubscription(subscription);
    EventHelper.onInternalSubscriptionSet(subscription.optedOut);
    EventHelper.checkAndTriggerSubscriptionChanged();
  }

  public async isDisabled(): Promise<boolean> {
    const subscription = await Database.getSubscription();
    return subscription.optedOut || false;
  }

  public async on(event: NotificationEvent, callback: (event: NotificationEventObject) => void): Promise<void> {

  }
}
