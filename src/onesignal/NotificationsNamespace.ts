import { getAppState, setAppState } from 'src/shared/database/config';
import {
  EmptyArgumentError,
  MalformedArgumentError,
  WrongTypeArgumentError,
} from 'src/shared/errors/common';
import { isValidUrl } from 'src/shared/helpers/validators';
import type {
  NotificationEventName,
  NotificationEventTypeMap,
} from 'src/shared/notifications/types';
import { EventListenerBase } from '../page/userModel/EventListenerBase';
import { NotificationPermission } from '../shared/models/NotificationPermission';
import {
  awaitOneSignalInitAndSupported,
  logMethodCall,
} from '../shared/utils/utils';
import OneSignal from './OneSignal';

export default class NotificationsNamespace extends EventListenerBase {
  private _permission: boolean;
  private _permissionNative?: NotificationPermission;

  constructor(permissionNative?: NotificationPermission) {
    super();

    this._permissionNative = permissionNative;
    this._permission = permissionNative === NotificationPermission.Granted;

    OneSignal.emitter.on(
      OneSignal.EVENTS.NOTIFICATION_PERMISSION_CHANGED_AS_STRING,
      (permissionNative: NotificationPermission) => {
        this._permissionNative = permissionNative;
        this._permission = permissionNative === NotificationPermission.Granted;
      },
    );
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
  async setDefaultUrl(url?: string) {
    logMethodCall('setDefaultUrl', url);

    if (typeof url === 'undefined') {
      throw EmptyArgumentError('url');
    }

    if (typeof url !== 'string') {
      throw WrongTypeArgumentError('url');
    }

    if (!isValidUrl(url, { allowNull: true }))
      throw MalformedArgumentError('url');
    await awaitOneSignalInitAndSupported();
    logMethodCall('setDefaultNotificationUrl', url);
    const appState = await getAppState();
    appState.defaultNotificationUrl = url;
    await setAppState(appState);
  }

  /**
   * Sets the default title to display on notifications. Will default to the site name provided
   * on the dashboard if you don't call this.
   * @remarks Either DB value defaultTitle or pageTitle is used when showing a notification title.
   * @PublicApi
   */
  async setDefaultTitle(title?: string) {
    logMethodCall('setDefaultTitle', title);

    if (typeof title === 'undefined') {
      throw EmptyArgumentError('title');
    }

    if (typeof title !== 'string') {
      throw WrongTypeArgumentError('title');
    }

    await awaitOneSignalInitAndSupported();
    const appState = await getAppState();
    appState.defaultNotificationTitle = title;
    await setAppState(appState);
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
   * Shows a native browser prompt.
   * Requirement: Must be called from a "user gesture" (click / tap event).
   *  Otherwise some browsers (Firefox & Safari) won't show anything.
   * Implementation choice note: We don't have any "error" handling when the
   *  requirement is not met, as browsers do not provide an API for this, w/o
   *  requiring be passed to this function that is.
   *  See https://github.com/OneSignal/OneSignal-Website-SDK/issues/1098
   * @PublicApi
   */
  async requestPermission(): Promise<void> {
    await awaitOneSignalInitAndSupported();
    await OneSignal.context.promptsManager.internalShowNativePrompt();
  }

  addEventListener<K extends NotificationEventName>(
    event: K,
    listener: (obj: NotificationEventTypeMap[K]) => void,
  ): void {
    OneSignal.emitter.on(event, listener);
  }

  removeEventListener<K extends NotificationEventName>(
    event: K,
    listener: (obj: NotificationEventTypeMap[K]) => void,
  ): void {
    OneSignal.emitter.off(event, listener);
  }
}
