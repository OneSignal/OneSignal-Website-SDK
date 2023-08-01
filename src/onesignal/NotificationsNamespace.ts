import { ValidatorUtils } from "../page/utils/ValidatorUtils";
import { InvalidArgumentError, InvalidArgumentReason } from "../shared/errors/InvalidArgumentError";
import Database from "../shared/services/Database";
import { awaitOneSignalInitAndSupported, logMethodCall } from "../shared/utils/utils";
import OneSignal from "./OneSignal";
import { EventListenerBase } from "../page/userModel/EventListenerBase";
import NotificationEventName from "../page/models/NotificationEventName";
import { NotificationPermission } from "../shared/models/NotificationPermission";
import NotificationEventTypeMap from "../page/models/NotificationEventTypeMap";

export default class NotificationsNamespace extends EventListenerBase {
  private _permission: boolean;

  constructor(private _permissionNative?: NotificationPermission) {
    super();

    this._permission = _permissionNative === NotificationPermission.Granted;

    OneSignal.emitter.on(OneSignal.EVENTS.NOTIFICATION_PERMISSION_CHANGED_AS_STRING, (permissionNative: NotificationPermission) => {
      this._permissionNative = permissionNative;
      this._permission = permissionNative === NotificationPermission.Granted;
    });
  }

  get permissionNative(): NotificationPermission | undefined {
    return this._permissionNative;
  }

  get permission(): boolean {
    return this._permission;
  }

  /**
   * Pass in the full URL of the default page you want to open when a notification is clicked.
   * @PublicApi
   */
  async setDefaultUrl(url: string) {
    logMethodCall('setDefaultUrl', url);

    if (typeof url === 'undefined') {
      throw new InvalidArgumentError('url', InvalidArgumentReason.Empty);
    }

    if (typeof url !== 'string') {
      throw new InvalidArgumentError('url', InvalidArgumentReason.WrongType);
    }

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
    logMethodCall('setDefaultTitle', title);

    if (typeof title === 'undefined') {
      throw new InvalidArgumentError('title', InvalidArgumentReason.Empty);
    }

    if (typeof title !== 'string') {
      throw new InvalidArgumentError('title', InvalidArgumentReason.WrongType);
    }

    await awaitOneSignalInitAndSupported();
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


  /*
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
  */

  /**
   * Shows a native browser prompt.
   * @PublicApi
   */
   async requestPermission(): Promise<void> {
    await awaitOneSignalInitAndSupported();
    const requiresUserInteraction = OneSignal.environmentInfo?.requiresUserInteraction;
    if (!requiresUserInteraction) {
      await OneSignal.context.promptsManager.internalShowNativePrompt();
      return;
    }

    await OneSignal.Slidedown.promptPush();
  }

  addEventListener<K extends NotificationEventName>(event: K, listener: (obj: NotificationEventTypeMap[K]) => void): void {
    OneSignal.emitter.on(event, listener);
  }

  removeEventListener<K extends NotificationEventName>(event: K, listener: (obj: NotificationEventTypeMap[K]) => void): void {
    OneSignal.emitter.off(event, listener);
  }
}
