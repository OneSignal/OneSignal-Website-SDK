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
  DelayedPromptType} from '../models/Prompts';
import { TagCategory, TagsObjectWithBoolean, TagsObjectForApi } from "../models/Tags";
import TestHelper from '../helpers/TestHelper';
import InitHelper, { RegisterOptions } from '../helpers/InitHelper';
import { SERVER_CONFIG_DEFAULTS_PROMPT_DELAYS } from '../config/index';
import { EnvironmentInfoHelper } from '../context/browser/helpers/EnvironmentInfoHelper';
import { awaitableTimeout } from '../utils/AwaitableTimeout';
import TaggingContainer from '../slidedown/TaggingContainer';
import TagUtils from '../utils/TagUtils';
import LocalStorage from '../utils/LocalStorage';
import PromptsHelper from '../helpers/PromptsHelper';

export interface AutoPromptOptions {
  force?: boolean;
  forceSlidedownOverNative?: boolean;
  isInUpdateMode?: boolean;
  categories?: TagCategory[];
}

export class PromptsManager {
  private isAutoPromptShowing: boolean;
  private context: ContextInterface;
  private eventHooksInstalled: boolean;

  constructor(context: ContextInterface) {
    this.isAutoPromptShowing = false;
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

      if (!userPromptOptions.native.enabled && userPromptOptions.slidedown.prompts.length === 0) {
        Log.error("No suitable prompt type enabled.");
        return;
      }

      const categoryOrPushPromptType = PromptsHelper.isCategorySlidedownConfigured(
        userPromptOptions?.slidedown?.prompts
      ) ? DelayedPromptType.Category : DelayedPromptType.Push;

      const nativePromptOptions = this.getDelayedPromptOptions(userPromptOptions, DelayedPromptType.Native);
      const isPageViewConditionMetForNative: boolean = this.isPageViewConditionMet(nativePromptOptions);

      const slidedownPromptOptions = this.getDelayedPromptOptions(userPromptOptions, categoryOrPushPromptType);
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
        this.internalShowDelayedPrompt(categoryOrPushPromptType, timeDelay || 0, options);
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
        this.internalShowNativePrompt();
        break;
      case DelayedPromptType.Push:
        this.internalShowSlidedownPrompt(options);
        break;
      case DelayedPromptType.Category:
        this.internalShowCategorySlidedown(options);
        break;
      default:
        Log.error("Invalid Delayed Prompt type");
    }
  }

  public async internalShowNativePrompt(): Promise<void> {
    OneSignalUtils.logMethodCall("internalShowNativePrompt");

    if (this.isAutoPromptShowing) {
      Log.debug("Already showing autoprompt. Abort showing a native prompt.");
      return;
    }

    this.isAutoPromptShowing = true;
    MainHelper.markHttpSlidedownShown();
    await InitHelper.registerForPushNotifications();
    this.isAutoPromptShowing = false;
    TestHelper.markHttpsNativePromptDismissed();
  }

  public async internalShowSlidedownPrompt(options: AutoPromptOptions = { force: false }): Promise<void> {
    OneSignalUtils.logMethodCall("internalShowSlidedownPrompt");
    const { categories, isInUpdateMode } = options;

    if (this.isAutoPromptShowing) {
      Log.debug("Already showing slidedown. Abort.");
      return;
    }

    try {
      const showPrompt = await this.checkIfAutoPromptShouldBeShown(options);
      if (!showPrompt) { return; }
    } catch(e) {
      Log.warn("checkIfAutoPromptShouldBeShown returned an error", e);
      return;
    }

    MainHelper.markHttpSlidedownShown();

    const sdkStylesLoadResult = await this.context.dynamicResourceLoader.loadSdkStylesheet();
    if (sdkStylesLoadResult !== ResourceLoadState.Loaded) {
      Log.debug('Not showing slidedown permission message because styles failed to load.');
      return;
    }
    const slidedownOptions =
      MainHelper.getSlidedownOptions(OneSignal.config.userConfig.promptOptions);

    if (!this.eventHooksInstalled) {
      this.installEventHooksForSlidedown();
    }

    // TO DO: iterate through each config in slidedownOptions and mount individually...
    // existing slidedown types: push, category. in current state, if category slidedown
    // is configured we use that config. in future, we should support both if configured
    // simultaneously
    const slidedownPromptOptions = PromptsHelper
      .getFirstSlidedownPromptOptionsWithType(slidedownOptions.prompts, DelayedPromptType.Category) ||
      PromptsHelper.getFirstSlidedownPromptOptionsWithType(slidedownOptions.prompts, DelayedPromptType.Push);

    OneSignal.slidedown = new Slidedown(slidedownPromptOptions);
    try {
      const { promptOptions } = this.context.appConfig.userConfig;
      if (PromptsHelper.isCategorySlidedownConfigured(promptOptions?.slidedown?.prompts) && !!categories) {
        // show slidedown with tagging container
        await OneSignal.slidedown.create(isInUpdateMode);
        let tagsForComponent: TagsObjectWithBoolean = {};
        const taggingContainer = new TaggingContainer();

        if (isInUpdateMode) {
          taggingContainer.load();
          // updating. pull remote tags.
          const existingTags = await OneSignal.getTags() as TagsObjectForApi;
          this.context.tagManager.storeRemotePlayerTags(existingTags);
          tagsForComponent = TagUtils.convertTagsApiToBooleans(existingTags);
        } else {
          // first subscription
          TagUtils.markAllTagsAsSpecified(categories, true);
        }
        taggingContainer.mount(categories, tagsForComponent);
      }
    } catch (e) {
      Log.error("OneSignal: Attempted to create tagging container with error" , e);
    }

    await OneSignal.slidedown.create();
    Log.debug('Showing Slidedown.');
  }

  // Wrapper for existing method `internalShowSlidedownPrompt`. Inserts information about
  // provided categories, then calls `internalShowSlidedownPrompt`.
  public async internalShowCategorySlidedown(options?: AutoPromptOptions): Promise<void> {
    const prompts = this.context.appConfig.userConfig.promptOptions?.slidedown?.prompts;

    if (prompts && !PromptsHelper.isCategorySlidedownConfigured(prompts)) {
      Log.error(`OneSignal: no categories to display. Check your configuration on the ` +
        `OneSignal dashboard or your custom code initialization.`);
      return;
    }

    const categorySlidedownOptions = PromptsHelper.getFirstSlidedownPromptOptionsWithType(
      prompts, DelayedPromptType.Category
    );

    const tagCategoryArray = categorySlidedownOptions?.categories;

    await this.internalShowSlidedownPrompt({
      ...options,
      categories: tagCategoryArray,
    });
  }

  public installEventHooksForSlidedown(): void {
    this.eventHooksInstalled = true;
    manageNotifyButtonStateWhileSlidedownShows();

    OneSignal.emitter.on(Slidedown.EVENTS.SHOWN, () => {
      this.isAutoPromptShowing = true;
    });
    OneSignal.emitter.on(Slidedown.EVENTS.CLOSED, () => {
      this.isAutoPromptShowing = false;
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
        OneSignal.slidedown.setSaveState(true);
        // Sync Category Slidedown tags (isInUpdateMode = true)
        try {
          await this.context.tagManager.sendTags(true);
        } catch (e) {
          Log.error("Failed to update tags", e);
          // Display tag update error
          OneSignal.slidedown.setSaveState(false);
          OneSignal.slidedown.setFailureState(true);
          return;
        }
      } else {
        const autoAccept = !OneSignal.environmentInfo.requiresUserInteraction;
        const options: RegisterOptions = { autoAccept, slidedown: true };
        InitHelper.registerForPushNotifications(options);
      }

      if (OneSignal.slidedown) {
        OneSignal.slidedown.close();
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
