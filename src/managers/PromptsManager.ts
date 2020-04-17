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
import {
  SlidedownPermissionMessageOptions,
  DelayedPromptOptions,
  AppUserConfigPromptOptions,
  DelayedPromptType} from '../models/Prompts';
import TestHelper from '../helpers/TestHelper';
import InitHelper, { RegisterOptions } from '../helpers/InitHelper';
import { SERVER_CONFIG_DEFAULTS_PROMPT_DELAYS } from '../config/index';
import { wrapSetTimeoutInPromise } from '../helpers/page/WrapSetTimeoutInPromise';

export interface AutoPromptOptions {
  force?: boolean;
  forceSlidedownOverNative?: boolean;
}

export class PromptsManager {
  private isAutoPromptShowing: boolean;
  private context: ContextInterface;

  constructor(context: ContextInterface) {
    this.isAutoPromptShowing = false;
    this.context = context;
  }

  private async checkIfAutoPromptShouldBeShown(options: AutoPromptOptions = { force: false }): Promise<boolean> {
    /*
    Only show the popover if:
    - Notifications aren't already enabled
    - The user isn't manually opted out (if the user was manually opted out, we don't want to prompt the user)
    */
    if (this.isAutoPromptShowing) {
      throw new InvalidStateError(InvalidStateReason.RedundantPermissionMessage, {
        permissionPromptType: PermissionPromptType.SlidedownPermissionMessage
      });
    }

    const doNotPrompt = MainHelper.wasHttpsNativePromptDismissed();
    if (doNotPrompt && !options.force) {
      Log.info(new PermissionMessageDismissedError());
      return false;
    }

    const permission = await OneSignal.privateGetNotificationPermission();
    if (permission === NotificationPermission.Denied) {
      Log.info(new PushPermissionNotGrantedError(PushPermissionNotGrantedErrorReason.Blocked));
      return false;
    }

    const isEnabled = await OneSignal.privateIsPushNotificationsEnabled();
    if (isEnabled) {
      throw new AlreadySubscribedError();
    }

    const notOptedOut = await OneSignal.privateGetSubscription();
    if (!notOptedOut) {
      throw new NotSubscribedError(NotSubscribedReason.OptedOut);
    }

    return true;
  }

  public async internalShowAutoPrompt(options: AutoPromptOptions = { force: false, forceSlidedownOverNative: false }
    ): Promise<void> {
      OneSignalUtils.logMethodCall("internalShowAutoPrompt", options);

      if (!OneSignal.config || !OneSignal.config.userConfig || !OneSignal.config.userConfig.promptOptions) {
        Log.error("OneSignal config was not initialized correctly. Aborting.");
        return;
      }
      const { forceSlidedownOverNative } = options;

      // user config prompt options
      const userPromptOptions = OneSignal.config.userConfig.promptOptions;

      if (!userPromptOptions.native.enabled && !userPromptOptions.slidedown.enabled) {
        Log.error("No suitable prompt type enabled.");
        return;
      }

      const nativePromptOptions = this.getDelayedPromptOptions(userPromptOptions, DelayedPromptType.Native);
      const isPageViewConditionMetForNative: boolean = this.isPageViewConditionMet(nativePromptOptions);

      const slidedownPromptOptions = this.getDelayedPromptOptions(userPromptOptions, DelayedPromptType.Slidedown);
      const isPageViewConditionMetForSlidedown: boolean = this.isPageViewConditionMet(slidedownPromptOptions);

      const conditionMetWithNativeOptions = nativePromptOptions.enabled && isPageViewConditionMetForNative;
      const conditionMetWithSlidedownOptions = slidedownPromptOptions.enabled && isPageViewConditionMetForSlidedown;
      const forceSlidedownWithNativeOptions = forceSlidedownOverNative && conditionMetWithNativeOptions;

      // show native prompt
      if (conditionMetWithNativeOptions && !forceSlidedownWithNativeOptions) {
        this.internalShowDelayedPrompt(DelayedPromptType.Native, nativePromptOptions.timeDelay || 0);
        return;
      }

      // show slidedown prompt
      if (conditionMetWithSlidedownOptions || forceSlidedownWithNativeOptions) {
        const { timeDelay } = conditionMetWithSlidedownOptions ? slidedownPromptOptions : nativePromptOptions;
        this.internalShowDelayedPrompt(DelayedPromptType.Slidedown, timeDelay || 0, options);
      }
  }

  public async internalShowDelayedPrompt(type: DelayedPromptType,
      timeDelaySeconds: number,
      options?: AutoPromptOptions
    ): Promise<void> {
    OneSignalUtils.logMethodCall("internalShowDelayedPrompt");
    if (typeof timeDelaySeconds !== "number") {
      Log.error("internalShowDelayedPrompt: timeDelay not a number");
      return;
    }

    switch(type){
      case DelayedPromptType.Native:
        if (timeDelaySeconds === 0) {
          await this.internalShowNativePrompt();
          break;
        }
        return wrapSetTimeoutInPromise(this.internalShowNativePrompt.bind(this), timeDelaySeconds);
      case DelayedPromptType.Slidedown:
        if (timeDelaySeconds === 0) {
          await this.internalShowSlidedownPrompt(options);
          break;
        }
        return wrapSetTimeoutInPromise(this.internalShowSlidedownPrompt.bind(this, options), timeDelaySeconds);
      default:
        Log.error("Invalid Delayed Prompt type");
    }
  }

  public async internalShowNativePrompt(): Promise<void> {
    OneSignalUtils.logMethodCall("internalShowNativePrompt");

    if (this.isAutoPromptShowing) {
      Log.debug("Already showing autopromt. Abort showing a native prompt.");
      return;
    }

    this.isAutoPromptShowing = true;
    MainHelper.markHttpPopoverShown();
    await InitHelper.registerForPushNotifications();
    this.isAutoPromptShowing = false;
    TestHelper.markHttpsNativePromptDismissed();
  }

  public async internalShowSlidedownPrompt(options: AutoPromptOptions = { force: false }): Promise<void> {
    OneSignalUtils.logMethodCall("internalShowSlidedownPrompt");

    if (this.isAutoPromptShowing) {
      Log.debug("Already showing autopromt. Abort showing a slidedown.");
      return;
    }

    try {
      const showPrompt = await this.checkIfAutoPromptShouldBeShown(options);
      if (!showPrompt) { return; }
    } catch(e) {
      Log.warn("checkIfAutoPromptShouldBeShown returned an error", e);
      return;
    }

    MainHelper.markHttpPopoverShown();

    const sdkStylesLoadResult = await this.context.dynamicResourceLoader.loadSdkStylesheet();
    if (sdkStylesLoadResult !== ResourceLoadState.Loaded) {
      Log.debug('Not showing slidedown permission message because styles failed to load.');
      return;
    }
    const slideDownOptions: SlidedownPermissionMessageOptions =
      MainHelper.getSlidedownPermissionMessageOptions(OneSignal.config.userConfig.promptOptions);

    this.installEventHooksForPopover();

    OneSignal.popover = new Popover(slideDownOptions);
    await OneSignal.popover.create();
    Log.debug('Showing Slidedown(Popover).');
  }

  public installEventHooksForPopover(): void {
    manageNotifyButtonStateWhilePopoverShows();

    OneSignal.emitter.once(Popover.EVENTS.SHOWN, () => {
      this.isAutoPromptShowing = true;
    });
    OneSignal.emitter.once(Popover.EVENTS.CLOSED, () => {
      this.isAutoPromptShowing = false;
    });
    OneSignal.emitter.once(Popover.EVENTS.ALLOW_CLICK, () => {
      if (OneSignal.popover) {
        OneSignal.popover.close();
      }
      Log.debug("Setting flag to not show the popover to the user again.");
      TestHelper.markHttpsNativePromptDismissed();
      const autoAccept = !OneSignal.environmentInfo.requiresUserInteraction;
      const options: RegisterOptions = { autoAccept };
      InitHelper.registerForPushNotifications(options);
    });
    OneSignal.emitter.once(Popover.EVENTS.CANCEL_CLICK, () => {
      Log.debug("Setting flag to not show the popover to the user again.");
      TestHelper.markHttpsNativePromptDismissed();
    });
  }

  private isPageViewConditionMet(options?: DelayedPromptOptions): boolean {
    if (!options || typeof options.pageViews === "undefined") { return false; }

    if (!options.autoPrompt || !options.enabled) { return false; }

    const localPageViews = this.context.pageViewManager.getLocalPageViewCount();
    return localPageViews >= options.pageViews;
  }

  private getDelayedPromptOptions(promptOptions: AppUserConfigPromptOptions,
      type: DelayedPromptType
    ): DelayedPromptOptions {
    const promptOptionsForSpecificType = promptOptions[type];
    if (!promptOptions || !promptOptionsForSpecificType) {
      return {
        enabled: false,
        autoPrompt: false,
        timeDelay: SERVER_CONFIG_DEFAULTS_PROMPT_DELAYS.timeDelay,
        pageViews: SERVER_CONFIG_DEFAULTS_PROMPT_DELAYS.pageViews
      };
    }
    return {
      enabled: promptOptionsForSpecificType.enabled,
      autoPrompt: promptOptionsForSpecificType.autoPrompt,
      timeDelay: promptOptionsForSpecificType.timeDelay,
      pageViews: promptOptionsForSpecificType.pageViews
    };
  }
}
