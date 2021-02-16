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
import Slidedown, { manageNotifyButtonStateWhileSlidedownShows } from '../slidedown/Slidedown';
import {
  DelayedPromptOptions,
  AppUserConfigPromptOptions,
  DelayedPromptType,
  SlidedownPromptOptions} from '../models/Prompts';
import TestHelper from '../helpers/TestHelper';
import InitHelper, { RegisterOptions } from '../helpers/InitHelper';
import { SERVER_CONFIG_DEFAULTS_PROMPT_DELAYS } from '../config/index';
import { EnvironmentInfoHelper } from '../context/browser/helpers/EnvironmentInfoHelper';
import { awaitableTimeout } from '../utils/AwaitableTimeout';
import TaggingContainer from '../slidedown/TaggingContainer';
import LocalStorage from '../utils/LocalStorage';
import PromptsHelper from '../helpers/PromptsHelper';
import bowser from "bowser";

export interface AutoPromptOptions {
  force?: boolean;
  forceSlidedownOverNative?: boolean;
  isInUpdateMode?: boolean;
  slidedownPromptOptions?: SlidedownPromptOptions;
}

export class PromptsManager {
  private isNativePromptShowing: boolean;
  private context: ContextInterface;
  private eventHooksInstalled: boolean;

  constructor(context: ContextInterface) {
    this.isNativePromptShowing = false;
    this.context = context;
    this.eventHooksInstalled = false;
  }

  private async checkIfAutoPromptShouldBeShown(options: AutoPromptOptions = { force: false }): Promise<boolean> {
    /*
    Only show the slidedown if:
    - Notifications aren't already enabled
    - The user isn't manually opted out (if the user was manually opted out, we don't want to prompt the user)
    */
    if (this.isAutoPromptShowing) {
      throw new InvalidStateError(InvalidStateReason.RedundantPermissionMessage, {
        permissionPromptType: PermissionPromptType.SlidedownPermissionMessage
      });
    }

    const doNotPrompt = MainHelper.wasHttpsNativePromptDismissed();
    if (doNotPrompt && !options.force && !options.isInUpdateMode) {
      Log.info(new PermissionMessageDismissedError());
      return false;
    }

    const permission = await OneSignal.privateGetNotificationPermission();
    if (permission === NotificationPermission.Denied) {
      Log.info(new PushPermissionNotGrantedError(PushPermissionNotGrantedErrorReason.Blocked));
      return false;
    }

    const isEnabled = await OneSignal.privateIsPushNotificationsEnabled();
    if (isEnabled && !options.isInUpdateMode) {
      throw new AlreadySubscribedError();
    }

    const notOptedOut = await OneSignal.privateGetSubscription();
    if (!notOptedOut) {
      throw new NotSubscribedError(NotSubscribedReason.OptedOut);
    }

    return true;
  }

  private shouldForceSlidedownOverNative(): boolean {
    const { environmentInfo } = OneSignal;
      const { browserType, browserVersion, requiresUserInteraction } = environmentInfo;

      return (
          (browserType === "chrome" && Number(browserVersion) >= 63 && (bowser.tablet || bowser.mobile)) ||
          requiresUserInteraction
        );
  }

  public async spawnAutoPrompts() {
    // user config prompt options
    const userPromptOptions: AppUserConfigPromptOptions = OneSignal.config.userConfig.promptOptions;

    /*
    * Chrome 63 on Android permission prompts are permanent without a dismiss option. To avoid
    * permanent blocks, we want to replace sites automatically showing the native browser request
    * with a slide prompt first.
    * Same for Safari 12.1+ & Firefox 72+. It requires user interaction to request notification permissions.
    * It simply wouldn't work to try to show native prompt from script.
    */
    const forceSlidedownOverNative = this.shouldForceSlidedownOverNative();

    // show native prompt
    const nativePromptOptions = this.getDelayedPromptOptions(userPromptOptions, DelayedPromptType.Native);
    const isPageViewConditionMetForNative: boolean = this.isPageViewConditionMet(nativePromptOptions);
    const conditionMetWithNativeOptions = nativePromptOptions.enabled && isPageViewConditionMetForNative;
    const forceSlidedownWithNativeOptions = forceSlidedownOverNative && conditionMetWithNativeOptions;

    if (conditionMetWithNativeOptions && !forceSlidedownWithNativeOptions) {
      this.internalShowDelayedPrompt(DelayedPromptType.Native, nativePromptOptions.timeDelay || 0);
      return;
    }

    // if slidedown not configured, condition met with native options, & should force slidedown over native:
    const isPushSlidedownConfigured = !!PromptsHelper.getFirstSlidedownPromptOptionsWithType(
      userPromptOptions.slidedown?.prompts, DelayedPromptType.Push
    );

    if (forceSlidedownWithNativeOptions && !isPushSlidedownConfigured) {
      this.internalShowDelayedPrompt(DelayedPromptType.Push, nativePromptOptions.timeDelay || 0);
    }

    // spawn slidedown prompts
    const prompts = userPromptOptions.slidedown?.prompts;
    if (!!prompts && prompts?.length > 0) {
      for (let i=0; i<prompts.length; i++) {
        const promptOptions = prompts[i];

        const slidedownPromptOptions = this.getDelayedPromptOptions(userPromptOptions, promptOptions.type);
        const isPageViewConditionMetForSlidedown: boolean = this.isPageViewConditionMet(slidedownPromptOptions);
        const conditionMetWithSlidedownOptions = slidedownPromptOptions.enabled && isPageViewConditionMetForSlidedown;

        const options: AutoPromptOptions = {
          slidedownPromptOptions: promptOptions
        };

        if (conditionMetWithSlidedownOptions) {
          this.internalShowDelayedPrompt(promptOptions.type, slidedownPromptOptions.timeDelay || 0, options);
        }
      }
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

      const { requiresUserInteraction } = EnvironmentInfoHelper.getEnvironmentInfo();
      if (requiresUserInteraction && type === DelayedPromptType.Native) {
        type = DelayedPromptType.Push; // Push Slidedown for cases where user interaction is needed
      }

      if (timeDelaySeconds > 0) {
        await awaitableTimeout(timeDelaySeconds * 1_000);
      }

      switch(type){
        case DelayedPromptType.Native:
          await this.internalShowNativePrompt();
          break;
        case DelayedPromptType.Push:
          await this.internalShowSlidedownPrompt(options);
          break;
        case DelayedPromptType.Category:
          await this.internalShowCategorySlidedown(options);
          break;
        default:
          Log.error("Invalid Delayed Prompt type");
      }
  }

  public async internalShowNativePrompt(): Promise<void> {
    OneSignalUtils.logMethodCall("internalShowNativePrompt");

    if (this.isNativePromptShowing) {
      Log.debug("Already showing autoprompt. Abort showing a native prompt.");
      return;
    }

    this.isNativePromptShowing = true;
    MainHelper.markHttpSlidedownShown();
    await InitHelper.registerForPushNotifications();
    this.isNativePromptShowing = false;
    TestHelper.markHttpsNativePromptDismissed();
  }

  public async internalShowSlidedownPrompt(options: AutoPromptOptions = { force: false }): Promise<void> {
    OneSignalUtils.logMethodCall("internalShowSlidedownPrompt");

    MainHelper.markHttpSlidedownShown();
    const sdkStylesLoadResult = await this.context.dynamicResourceLoader.loadSdkStylesheet();
    if (sdkStylesLoadResult !== ResourceLoadState.Loaded) {
      Log.debug('Not showing slidedown permission message because styles failed to load.');
      return;
    }

    if (!this.eventHooksInstalled) {
      this.installEventHooksForSlidedown();
    }

    await this.context.slidedownManager.createSlidedown(options);
  }

  // Wrapper for existing method `internalShowSlidedownPrompt`. Inserts information about
  // provided categories, then calls `internalShowSlidedownPrompt`.
  public async internalShowCategorySlidedown(options?: AutoPromptOptions): Promise<void> {
    const prompts = this.context.appConfig.userConfig.promptOptions?.slidedown?.prompts;
    const slidedownPromptOptions = options?.slidedownPromptOptions ||
      PromptsHelper.getFirstSlidedownPromptOptionsWithType(prompts, DelayedPromptType.Category);

    if (!slidedownPromptOptions) {
      Log.error(`OneSignal: no categories to display. Check your configuration on the ` +
        `OneSignal dashboard or your custom code initialization.`);
      return;
    }

    await this.internalShowSlidedownPrompt({
      ...options,
      slidedownPromptOptions
    });
  }

  public installEventHooksForSlidedown(): void {
    this.eventHooksInstalled = true;
    manageNotifyButtonStateWhileSlidedownShows();

    OneSignal.emitter.on(Slidedown.EVENTS.SHOWN, () => {
      this.context.slidedownManager.setIsSlidedownShowing(true);
    });
    OneSignal.emitter.on(Slidedown.EVENTS.CLOSED, () => {
      this.context.slidedownManager.setIsSlidedownShowing(false);
      this.context.slidedownManager.showQueued();
    });
    OneSignal.emitter.on(Slidedown.EVENTS.ALLOW_CLICK, async () => {
      const { slidedown } = OneSignal;
      if (slidedown.isShowingFailureState) {
        slidedown.setFailureState(false);
      }
      const tags = TaggingContainer.getValuesFromTaggingContainer();
      this.context.tagManager.storeTagValuesToUpdate(tags);
      // use local storage permission to get around user-gesture sync requirement
      const isPushEnabled: boolean = LocalStorage.getIsPushNotificationsEnabled();

      if (isPushEnabled) {
        slidedown.setSaveState(true);
        // Sync Category Slidedown tags (isInUpdateMode = true)
        try {
          await this.context.tagManager.sendTags(true);
        } catch (e) {
          Log.error("Failed to update tags", e);
          // Display tag update error
          slidedown.setSaveState(false);
          slidedown.setFailureState(true);
          return;
        }
      } else {
        const autoAccept = !OneSignal.environmentInfo.requiresUserInteraction;
        const options: RegisterOptions = { autoAccept, slidedown: true };
        InitHelper.registerForPushNotifications(options);
      }

      if (slidedown) {
        slidedown.close();
        // called here for compatibility with unit tests (close function doesn't run fully in test env)
        slidedown.triggerSlidedownEvent(Slidedown.EVENTS.CLOSED);
      }
      Log.debug("Setting flag to not show the slidedown to the user again.");
      TestHelper.markHttpsNativePromptDismissed();
    });
    OneSignal.emitter.once(Slidedown.EVENTS.CANCEL_CLICK, () => {
      Log.debug("Setting flag to not show the slidedown to the user again.");
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
      const defaultOptions = {
        enabled: false,
        autoPrompt: false,
        timeDelay: SERVER_CONFIG_DEFAULTS_PROMPT_DELAYS.timeDelay,
        pageViews: SERVER_CONFIG_DEFAULTS_PROMPT_DELAYS.pageViews
      };

      if (!promptOptions || !promptOptions.native || !promptOptions.slidedown) {
        // default
        return defaultOptions;
      }

      switch (type) {
        case DelayedPromptType.Native:
          const nativePromptOptions = promptOptions.native;
          return {
            enabled: nativePromptOptions?.enabled,
            autoPrompt: nativePromptOptions?.autoPrompt,
            timeDelay: nativePromptOptions?.timeDelay,
            pageViews: nativePromptOptions?.pageViews
          };
        case DelayedPromptType.Push:
        case DelayedPromptType.Category:
        case DelayedPromptType.Email:
        case DelayedPromptType.Sms:
        case DelayedPromptType.SmsAndEmail:
          const { userConfig } = this.context.appConfig;
          const options = PromptsHelper
            .getFirstSlidedownPromptOptionsWithType(userConfig.promptOptions?.slidedown?.prompts || [], type);
          return {
            enabled: !!options,
            autoPrompt: !!options?.autoPrompt,
            timeDelay: options?.delay?.timeDelay,
            pageViews: options?.delay?.pageViews
          };
        default:
          return defaultOptions;
      }
  }
}
