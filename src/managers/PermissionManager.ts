import OneSignalUtils from '../utils/OneSignalUtils';
import bowser from 'bowser';
import { InvalidArgumentError, InvalidArgumentReason } from '../errors/InvalidArgumentError';
import Database from '../services/Database';
import { NotificationPermission } from '../models/NotificationPermission';
import SdkEnvironment from '../managers/SdkEnvironment';
import LocalStorage from '../utils/LocalStorage';
import OneSignal from "../OneSignal"

/**
 * A permission manager to consolidate the different quirks of obtaining and evaluating permissions
 * across Safari, Chrome, and Firefox.
 */
export default class PermissionManager {

  static get STORED_PERMISSION_KEY() {
    return 'storedNotificationPermission';
  }

  /**
   * Returns an interpreted version of the browser's notification permission.
   *
   * On some environments, it isn't possible to obtain the actual notification
   * permission. For example, starting with Chrome 62+, cross-origin iframes and
   * insecure origins can no longer accurately detect the default notification
   * permission state.
   *
   * For cross-origin iframes, returned permissions are correct except that
   * "denied" is returned instead of "default".
   *
   * For insecure origins, returned permissions are always "denied". This
   * differs from cross-origin iframes where the cross-origin iframes are
   * acurrate if returning "granted", but insecure origins will always return
   * "denied" regardless of the actual permission.
   *
   * This method therefore returns the notification permission best suited for
   * our SDK, and it may not always be accurate. On most environments (i.e. not
   * Chrome 62+), the returned permission will be accurate.
   *
   * @param safariWebId The Safari web ID necessary to access the permission
   * state on Safari.
   */
  public async getNotificationPermission(safariWebId?: string): Promise<NotificationPermission> {
    const reportedPermission = await this.getReportedNotificationPermission(safariWebId);
    if (await this.isPermissionEnvironmentAmbiguous(reportedPermission))
      return await this.getInterpretedAmbiguousPermission(reportedPermission);
    return reportedPermission;
  }

  /**
   * Returns the browser's actual notification permission as reported without any modifications.
   *
   * One challenge is determining the frame context our permission query needs to run in:
   *
   *   - For a regular top-level HTTPS site, query our current top-level frame
   *
   *   - For a custom web push setup in a child HTTPS iframe, query our current child iframe (even
   *     though the returned permission is ambiguous on Chrome 62+ if our origin is different from
   *     that of the top-level frame)
   *
   *   - For a regular HTTP site, query OneSignal's child subdomain.os.tc or subdomain.onesignal.com
   *     iframe
   *
   *   - For a regular HTTP site embedded in a child iframe, still query the nested child's
   *     OneSignal subdomain.os.tc or subdomain.onesignal.com iframe
   *
   * This simplifies into determining whether the web push setup is using OneSignal's subdomain. If
   * not, we assume the current frame context, regardless of whether it is a child or top-level
   * frame, is the current context to run the permission query in.
   *
   * @param safariWebId The Safari web ID necessary to access the permission state on Safari.
   */
  public async getReportedNotificationPermission(safariWebId?: string): Promise<NotificationPermission>{
    if (bowser.safari)
      return PermissionManager.getSafariNotificationPermission(safariWebId);

    // Is this web push setup using subdomain.os.tc or subdomain.onesignal.com?
    if (OneSignalUtils.isUsingSubscriptionWorkaround())
      return await this.getOneSignalSubdomainNotificationPermission(safariWebId);
    else
      return this.getW3cNotificationPermission();
  }

  /**
   * Returns the Safari browser's notification permission as reported by the browser.
   *
   * @param safariWebId The Safari web ID necessary to access the permission state on Safari.
   */
  private static getSafariNotificationPermission(safariWebId?: string): NotificationPermission {
    if (safariWebId)
      return window.safari.pushNotification.permission(safariWebId).permission as NotificationPermission;
    throw new InvalidArgumentError('safariWebId', InvalidArgumentReason.Empty);
  }

  /**
   * Returns the notification permission as reported by the browser for non-Safari browsers. This
   * includes Chrome, Firefox, Opera, Yandex, and every browser following the Notification API
   * standard.
   */
  private getW3cNotificationPermission(): NotificationPermission {
    return window.Notification.permission as NotificationPermission;
  }

  /**
   * Returns the notification permission as reported by the browser for the OneSignal subdomain
   * iframe.
   *
   * @param safariWebId The Safari web ID necessary to access the permission state on Safari.
   */
  public async getOneSignalSubdomainNotificationPermission(safariWebId?: string): Promise<NotificationPermission> {
    return new Promise<NotificationPermission>(resolve => {
      OneSignal.proxyFrameHost.message(
        OneSignal.POSTMAM_COMMANDS.REMOTE_NOTIFICATION_PERMISSION,
        { safariWebId: safariWebId },
        (reply: any) => {
          let remoteNotificationPermission = reply.data;
          resolve(remoteNotificationPermission);
        }
      );
    });
  }

  /**
   * To interpret the browser's reported notification permission, we need to know whether we're in
   * an environment where the returned permission should be treated ambiguously.
   *
   * The reported permission should only be treated ambiguously if:
   *
   *   - We're not on Safari or Firefox (Chromium, Chrome, Opera, and Yandex will all eventually
   *     share the same Chrome 62+ codebase)
   *
   *   - And the reported permission is "denied"
   *
   *   - And the current frame context is either a cross-origin iframe or insecure
   */
  public async isPermissionEnvironmentAmbiguous(permission: NotificationPermission): Promise<boolean> {
    // For testing purposes, allows changing the browser user agent
    const browser = OneSignalUtils.redetectBrowserUserAgent();

    return (!browser.safari &&
            !browser.firefox &&
            permission === NotificationPermission.Denied &&
            (
              this.isCurrentFrameContextCrossOrigin() ||
              await SdkEnvironment.isFrameContextInsecure() ||
              OneSignalUtils.isUsingSubscriptionWorkaround() ||
              SdkEnvironment.isInsecureOrigin()
            )
           );
  }

  /**
   * Returns true if we're a cross-origin iframe.
   *
   * This means:
   *
   *   - We're not the top-level frame
   *   - We're unable to access to the top-level frame's origin, or we can access the origin but it
   *     is different. On most browsers, accessing the top-level origin should throw an exception.
   */
  public isCurrentFrameContextCrossOrigin(): boolean {
    let topFrameOrigin: string;

    try {
      // Accessing a cross-origin top-level frame's origin should throw an error
      topFrameOrigin = window.top.location.origin;
    } catch (e) {
      // We're in a cross-origin child iframe
      return true;
    }

    return window.top !== window &&
           topFrameOrigin !== window.location.origin;
  }

  /**
   * To workaround Chrome 62+'s permission ambiguity for "denied" permissions,
   * we assume the permission is "default" until we actually record the
   * permission being "denied" or "granted".
   *
   * This allows our best-effort approach to subscribe new users, and upon
   * subscribing, if we discover the actual permission to be denied, we record
   * this for next time.
   *
   * @param reportedPermission The notification permission as reported by the
   * browser without any modifications.
   */
  public async getInterpretedAmbiguousPermission(reportedPermission: NotificationPermission) {
    switch (reportedPermission) {
      case NotificationPermission.Denied:
        const storedPermission = this.getStoredPermission();

        if (storedPermission) {
          // If we've recorded the last known actual browser permission, return that
          return storedPermission;
        } else {
          // If we don't have any stored permission, assume default
          return NotificationPermission.Default;
        }
      default:
        return reportedPermission;
    }
  }

  public getStoredPermission(): NotificationPermission {
    return LocalStorage.getStoredPermission();
  }

  public setStoredPermission(permission: NotificationPermission) {
    LocalStorage.setStoredPermission(permission);
  }

  public async updateStoredPermission() {
    // TODO verify if `OneSignal.config.safariWebId` should be passed as a parameter
    const permission = await this.getNotificationPermission();
    return this.setStoredPermission(permission);
  }
}
