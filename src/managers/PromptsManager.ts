import Log from "../libraries/Log";
import OneSignalUtils from "../utils/OneSignalUtils";
import { ContextInterface } from "../models/Context";
import { NotSubscribedError, NotSubscribedReason } from "../errors/NotSubscribedError";
import MainHelper from '../helpers/MainHelper';
import AlreadySubscribedError from '../errors/AlreadySubscribedError';
import PermissionMessageDismissedError from '../errors/PermissionMessageDismissedError';
import PushPermissionNotGrantedError from '../errors/PushPermissionNotGrantedError';
import { PushPermissionNotGrantedErrorReason } from '../errors/PushPermissionNotGrantedError';
import { PermissionPromptType } from '../models/PermissionPromptType';
import { InvalidStateError, InvalidStateReason } from '../errors/InvalidStateError';
import { NotificationPermission } from '../models/NotificationPermission';
import { ResourceLoadState } from '../services/DynamicResourceLoader';
import Popover, { manageNotifyButtonStateWhilePopoverShows } from '../popover/Popover';
import { SlidedownPermissionMessageOptions } from '../models/AppConfig';
import TestHelper from '../helpers/TestHelper';

export interface AutoPromptOptions {
  force: boolean;
}

export class PromptsManager {
  constructor(_context: ContextInterface) {
  }

  private async checkIfAutoPromptShouldBeShown(options: AutoPromptOptions = { force: false }) {
    /*
    Only show the popover if:
    - Notifications aren't already enabled
    - The user isn't manually opted out (if the user was manually opted out, we don't want to prompt the user)
    */
    if (OneSignal.__isAutoPromptShowing) {
      throw new InvalidStateError(InvalidStateReason.RedundantPermissionMessage, {
        permissionPromptType: PermissionPromptType.SlidedownPermissionMessage
      });
    }

    const doNotPrompt = MainHelper.wasHttpsNativePromptDismissed();

    if (doNotPrompt && !options.force) {
      Log.info(new PermissionMessageDismissedError());
      return;
    }

    const permission = await OneSignal.privateGetNotificationPermission();
    if (permission === NotificationPermission.Denied) {
      Log.info(new PushPermissionNotGrantedError(PushPermissionNotGrantedErrorReason.Blocked));
      return;
    }

    const isEnabled = await OneSignal.privateIsPushNotificationsEnabled();
    if (isEnabled) {
      throw new AlreadySubscribedError();
    }

    const notOptedOut = await OneSignal.privateGetSubscription();
    if (!notOptedOut) {
      throw new NotSubscribedError(NotSubscribedReason.OptedOut);
    }
  }

  public async internalShowAutoPrompt(options: AutoPromptOptions = { force: false }): Promise<void> {
    OneSignalUtils.logMethodCall("internalShowAutoPrompt", options);

    if (!this.checkIfAutoPromptShouldBeShown(options)) {
      return;
    }
    
    if (!OneSignal.config || !OneSignal.config.userConfig.promptOptions) {
      Log.error("OneSignal config was not initialized correctly. Aborting.");
      return;
    }

    const promptOptions = OneSignal.config.userConfig.promptOptions;
    if (!promptOptions.native && !promptOptions.slidedown) {
      Log.error("No suitable prompt type enabled.");
      return;
    }

    if (promptOptions.native && promptOptions.native.enabled) {
      await OneSignal.privateShowNativePrompt();
    } else if (promptOptions.slidedown && promptOptions.slidedown.enabled) {
      await OneSignal.privateShowSlidedownPrompt();
    }
  }

  public async internalShowNativePrompt(): Promise<void> {
    OneSignalUtils.logMethodCall("internalShowNativePrompt");

    if (OneSignal.__isAutoPromptShowing) {
      Log.debug("Already showing autopromt. Abort showing a native prompt.");
      return;
    }

    OneSignal.__isAutoPromptShowing = true;
    MainHelper.markHttpPopoverShown();
    await OneSignal.registerForPushNotifications();
    OneSignal.__isAutoPromptShowing = false;
    TestHelper.markHttpsNativePromptDismissed();
  }

  public async internalShowSlidedownPrompt(): Promise<void> {
    OneSignalUtils.logMethodCall("internalShowSlidedownPrompt");

    if (OneSignal.__isAutoPromptShowing) {
      Log.debug("Already showing autopromt. Abort showing a slidedown.");
      return;
    }

    MainHelper.markHttpPopoverShown();

    const sdkStylesLoadResult = await OneSignal.context.dynamicResourceLoader.loadSdkStylesheet();
    if (sdkStylesLoadResult !== ResourceLoadState.Loaded) {
      Log.debug('Not showing slidedown permission message because styles failed to load.');
      return;
    }
    const slideDownOptions: SlidedownPermissionMessageOptions =
      MainHelper.getSlidedownPermissionMessageOptions(OneSignal.config.userConfig.promptOptions);
    if (!slideDownOptions.enabled) {
      Log.warn("Slidedown not enabled. Not showing.");
    }

    OneSignal.popover = new Popover(slideDownOptions);
    await OneSignal.popover.create();
    Log.debug('Showing Slidedown(Popover).');

    manageNotifyButtonStateWhilePopoverShows();

    OneSignal.emitter.once(Popover.EVENTS.SHOWN, () => {
      OneSignal.__isAutoPromptShowing = true;
    });
    OneSignal.emitter.once(Popover.EVENTS.CLOSED, () => {
      OneSignal.__isAutoPromptShowing = false;
    });
    OneSignal.emitter.once(Popover.EVENTS.ALLOW_CLICK, () => {
      if (OneSignal.popover) {
        OneSignal.popover.close();
      }
      Log.debug("Setting flag to not show the popover to the user again.");
      TestHelper.markHttpsNativePromptDismissed();
      OneSignal.registerForPushNotifications({ autoAccept: true });
    });
    OneSignal.emitter.once(Popover.EVENTS.CANCEL_CLICK, () => {
      Log.debug("Setting flag to not show the popover to the user again.");
      TestHelper.markHttpsNativePromptDismissed();
    });
  }
}
