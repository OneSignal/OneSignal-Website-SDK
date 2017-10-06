import { PermissionPrompt } from './PermissionPrompt';
import { PermissionPromptResult } from '../models/PermissionPromptResult';
import { NotificationPermission } from '../models/NotificationPermission';
import Event from '../Event';
import MainHelper from '../helpers/MainHelper';
import EventHelper from '../helpers/EventHelper';
import PushPermissionNotGrantedError from '../errors/PushPermissionNotGrantedError';

/**
 * Represents the browser's native permission request for HTTPS sites.
 */
export class HttpsPermissionRequest extends PermissionPrompt {
  private resolvePromise: Promise<any>;
  get name() {
    return 'https-permission-request';
  }

  /*
   Test Cases

    - Permission prompt displayed event fires if permission is default
    - Browser notification prompt is shown
    - notificationPermissionChange event is triggered
    - Default permisison triggers notificationPermissionChange event
  */
  async show() {
    const preRequestPermission: NotificationPermission = window.Notification.permission;
    if (preRequestPermission === NotificationPermission.Default) {
      Event.trigger(OneSignal.EVENTS.PERMISSION_PROMPT_DISPLAYED);
    }
    this.resolvePromise = new Promise(resolve => window.Notification.requestPermission(resolve));
    super.show();
  }

  async resolve(): Promise<PermissionPromptResult> {
    await this.resolvePromise;
    const postRequestPermission: NotificationPermission = window.Notification.permission;

    let result: PermissionPromptResult;

    switch (postRequestPermission) {
      case NotificationPermission.Default:
        /*
          Notification permission changes are already broadcast by the page's
          notificationpermissionchange handler. This means that allowing or
          denying the permission prompt will cause double events. However, the
          native event handler does not broadcast an event for dismissing the
          prompt, because going from "default" permissions to "default"
          permissions isn't a change. We specifically broadcast "default" to
          "default" changes.
        */
        EventHelper.triggerNotificationPermissionChanged(true);
        result = PermissionPromptResult.Cancel;
        break;
      case NotificationPermission.Denied:
        result = PermissionPromptResult.Cancel;
        break;
      case NotificationPermission.Granted:
        result = PermissionPromptResult.Continue;
        break;
    }

    super.resolve();
    return result;
  }

  async hide() {
    super.hide();
    /* No Implementation */
  }
}
