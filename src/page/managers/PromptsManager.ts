import { Browser } from 'src/shared/models/Browser';
import {
  CONFIG_DEFAULTS_SLIDEDOWN_OPTIONS,
  SERVER_CONFIG_DEFAULTS_PROMPT_DELAYS,
} from 'src/shared/constants';
import { DismissHelper } from '../../shared/helpers/DismissHelper';
import InitHelper from '../../shared/helpers/InitHelper';
import PromptsHelper from '../../shared/helpers/PromptsHelper';
import Log from '../../shared/libraries/Log';
import {
  DelayedPromptType,
  type AppUserConfigPromptOptions,
  type DelayedPromptOptions,
  type DelayedPromptTypeValue,
  type SlidedownPromptOptions,
} from '../../shared/models/Prompts';
import OneSignalEvent from '../../shared/services/OneSignalEvent';
import { awaitableTimeout } from '../../shared/utils/AwaitableTimeout';
import { bowserCastle } from '../../shared/utils/bowserCastle';
import OneSignalUtils from '../../shared/utils/OneSignalUtils';
import { EnvironmentInfoHelper } from '../helpers/EnvironmentInfoHelper';
import type { ContextInterface } from '../models/Context';
import { DismissPrompt } from '../models/Dismiss';
import { ResourceLoadState } from '../services/DynamicResourceLoader';
import Slidedown from '../slidedown/Slidedown';

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

  private shouldForceSlidedownOverNative(): boolean {
    const { environmentInfo } = OneSignal;
    const { browserType, browserVersion, requiresUserInteraction } =
      environmentInfo!;

    return (
      (browserType === Browser.Chrome &&
        Number(browserVersion) >= 63 &&
        (bowserCastle().tablet || bowserCastle().mobile)) ||
      requiresUserInteraction
    );
  }

  public async spawnAutoPrompts() {
    // user config prompt options
    const userPromptOptions = OneSignal.config?.userConfig.promptOptions;

    /*
     * Chrome 63 on Android permission prompts are permanent without a dismiss option. To avoid
     * permanent blocks, we want to replace sites automatically showing the native browser request
     * with a slide prompt first.
     * Same for Safari 12.1+ & Firefox 72+. It requires user interaction to request notification permissions.
     * It simply wouldn't work to try to show native prompt from script.
     */
    const forceSlidedownOverNative = this.shouldForceSlidedownOverNative();

    // show native prompt
    const nativePromptOptions = this.getDelayedPromptOptions(
      userPromptOptions,
      DelayedPromptType.Native,
    );
    const isPageViewConditionMetForNative: boolean =
      this.isPageViewConditionMet(nativePromptOptions);
    const conditionMetWithNativeOptions =
      nativePromptOptions.enabled && isPageViewConditionMetForNative;
    const forceSlidedownWithNativeOptions =
      forceSlidedownOverNative && conditionMetWithNativeOptions;

    if (conditionMetWithNativeOptions && !forceSlidedownWithNativeOptions) {
      this.internalShowDelayedPrompt(
        DelayedPromptType.Native,
        nativePromptOptions.timeDelay || 0,
      );
      return;
    }

    // if slidedown not configured, condition met with native options, & should force slidedown over native:
    const isPushSlidedownConfigured =
      !!PromptsHelper.getFirstSlidedownPromptOptionsWithType(
        userPromptOptions?.slidedown?.prompts,
        DelayedPromptType.Push,
      );

    if (forceSlidedownWithNativeOptions && !isPushSlidedownConfigured) {
      this.internalShowDelayedPrompt(
        DelayedPromptType.Push,
        nativePromptOptions.timeDelay || 0,
      );
    }

    // spawn slidedown prompts
    const prompts = userPromptOptions?.slidedown?.prompts;
    if (!!prompts && prompts?.length > 0) {
      for (let i = 0; i < prompts.length; i++) {
        const promptOptions = prompts[i];

        const slidedownPromptOptions = this.getDelayedPromptOptions(
          userPromptOptions,
          promptOptions.type,
        );
        const isPageViewConditionMetForSlidedown: boolean =
          this.isPageViewConditionMet(slidedownPromptOptions);
        const conditionMetWithSlidedownOptions =
          slidedownPromptOptions.enabled && isPageViewConditionMetForSlidedown;

        const options: AutoPromptOptions = {
          slidedownPromptOptions: promptOptions,
        };

        if (conditionMetWithSlidedownOptions) {
          this.internalShowDelayedPrompt(
            promptOptions.type,
            slidedownPromptOptions.timeDelay || 0,
            options,
          );
        }
      }
    }
  }

  public async internalShowDelayedPrompt(
    type: DelayedPromptTypeValue,
    timeDelaySeconds: number,
    options?: AutoPromptOptions,
  ): Promise<void> {
    OneSignalUtils.logMethodCall('internalShowDelayedPrompt');
    if (typeof timeDelaySeconds !== 'number') {
      Log.error('internalShowDelayedPrompt: timeDelay not a number');
      return;
    }

    const { requiresUserInteraction } =
      EnvironmentInfoHelper.getEnvironmentInfo();
    if (requiresUserInteraction && type === DelayedPromptType.Native) {
      type = DelayedPromptType.Push; // Push Slidedown for cases where user interaction is needed
    }

    if (timeDelaySeconds > 0) {
      await awaitableTimeout(timeDelaySeconds * 1_000);
    }

    switch (type) {
      case DelayedPromptType.Native:
        await this.internalShowNativePrompt();
        break;
      case DelayedPromptType.Push:
        await this.internalShowSlidedownPrompt(options);
        break;
      case DelayedPromptType.Category:
        await this.internalShowCategorySlidedown(options);
        break;
      case DelayedPromptType.Sms:
        await this.internalShowSmsSlidedown(options);
        break;
      case DelayedPromptType.Email:
        await this.internalShowEmailSlidedown(options);
        break;
      case DelayedPromptType.SmsAndEmail:
        await this.internalShowSmsAndEmailSlidedown(options);
        break;
      default:
        Log.error('Invalid Delayed Prompt type');
    }
  }

  public async internalShowNativePrompt(): Promise<void> {
    OneSignalUtils.logMethodCall('internalShowNativePrompt');

    if (this.isNativePromptShowing) {
      Log.debug('Already showing autoprompt. Abort showing a native prompt.');
      return;
    }

    this.isNativePromptShowing = true;
    await InitHelper.registerForPushNotifications();
    this.isNativePromptShowing = false;
    DismissHelper.markPromptDismissedWithType(DismissPrompt.Push);
  }

  private async internalShowSlidedownPrompt(
    options: AutoPromptOptions = { force: false },
  ): Promise<void> {
    OneSignalUtils.logMethodCall('internalShowSlidedownPrompt');

    if (!options.slidedownPromptOptions) {
      options.slidedownPromptOptions = CONFIG_DEFAULTS_SLIDEDOWN_OPTIONS;
    }

    const sdkStylesLoadResult =
      await this.context.dynamicResourceLoader.loadSdkStylesheet();
    if (sdkStylesLoadResult !== ResourceLoadState.Loaded) {
      Log.debug(
        'Not showing slidedown permission message because styles failed to load.',
      );
      return;
    }

    if (!this.eventHooksInstalled) {
      this.installEventHooksForSlidedown();
    }

    await this.context.slidedownManager.createSlidedown(options);
  }

  public async internalShowCategorySlidedown(
    options?: AutoPromptOptions,
  ): Promise<void> {
    OneSignalUtils.logMethodCall('internalShowCategorySlidedown');
    await this.internalShowParticularSlidedown(
      DelayedPromptType.Category,
      options,
    );
  }

  public async internalShowSmsSlidedown(
    options?: AutoPromptOptions,
  ): Promise<void> {
    OneSignalUtils.logMethodCall('internalShowSmsSlidedown');
    await this.internalShowParticularSlidedown(DelayedPromptType.Sms, options);
  }

  public async internalShowEmailSlidedown(
    options?: AutoPromptOptions,
  ): Promise<void> {
    OneSignalUtils.logMethodCall('internalShowEmailSlidedown');
    await this.internalShowParticularSlidedown(
      DelayedPromptType.Email,
      options,
    );
  }

  public async internalShowSmsAndEmailSlidedown(
    options?: AutoPromptOptions,
  ): Promise<void> {
    OneSignalUtils.logMethodCall('internalShowSmsAndEmailSlidedown');
    await this.internalShowParticularSlidedown(
      DelayedPromptType.SmsAndEmail,
      options,
    );
  }

  /**
   * Generalized shower function to show particular slidedown types
   * @param  {DelayedPromptType} typeToPullFromConfig - slidedown type to look for in config if not passed via `options`
   * @param  {AutoPromptOptions} options - passed in via another internal function or top level OneSignal slidedown func
   *
   * If present, `options.slidedownPromptOptions` overrides `typeToPullFromConfig`
   */
  public async internalShowParticularSlidedown(
    typeToPullFromConfig: DelayedPromptTypeValue,
    options?: AutoPromptOptions,
  ): Promise<void> {
    const prompts =
      this.context.appConfig.userConfig.promptOptions?.slidedown?.prompts;
    const slidedownPromptOptions =
      options?.slidedownPromptOptions ||
      PromptsHelper.getFirstSlidedownPromptOptionsWithType(
        prompts,
        typeToPullFromConfig,
      );

    if (!slidedownPromptOptions) {
      if (typeToPullFromConfig !== DelayedPromptType.Push) {
        Log.error(
          `OneSignal: slidedown of type '${typeToPullFromConfig}' couldn't be shown. Check your configuration` +
            ` on the OneSignal dashboard or your custom code initialization.`,
        );
        return;
      } else {
        Log.warn(
          `The OneSignal 'push' slidedown will be shown with default text settings.` +
            ` To customize, see the OneSignal documentation.`,
        );
      }
    }

    await this.internalShowSlidedownPrompt({
      ...options,
      slidedownPromptOptions,
    });
  }

  public installEventHooksForSlidedown(): void {
    this.eventHooksInstalled = true;

    OneSignal.emitter.on(Slidedown.EVENTS.SHOWN, () => {
      this.context.slidedownManager.setIsSlidedownShowing(true);
    });
    OneSignal.emitter.on(Slidedown.EVENTS.CLOSED, () => {
      this.context.slidedownManager.setIsSlidedownShowing(false);
      this.context.slidedownManager.showQueued();
    });
    OneSignal.emitter.on(Slidedown.EVENTS.ALLOW_CLICK, async () => {
      await this.context.slidedownManager.handleAllowClick();
      OneSignalEvent.trigger(
        OneSignal.EVENTS.TEST_FINISHED_ALLOW_CLICK_HANDLING,
      );
    });
    OneSignal.emitter.on(Slidedown.EVENTS.CANCEL_CLICK, () => {
      if (!this.context.slidedownManager.slidedown) {
        return;
      }

      const type = this.context.slidedownManager.slidedown?.options.type;
      switch (type) {
        case DelayedPromptType.Push:
        case DelayedPromptType.Category:
          Log.debug(
            'Setting flag to not show the slidedown to the user again.',
          );
          DismissHelper.markPromptDismissedWithType(DismissPrompt.Push);
          break;
        default:
          Log.debug(
            'Setting flag to not show the slidedown to the user again.',
          );
          DismissHelper.markPromptDismissedWithType(DismissPrompt.NonPush);
          break;
      }
    });
  }

  private isPageViewConditionMet(options?: DelayedPromptOptions): boolean {
    if (!options || typeof options.pageViews === 'undefined') {
      return false;
    }

    if (!options.autoPrompt || !options.enabled) {
      return false;
    }

    const localPageViews = this.context.pageViewManager.getLocalPageViewCount();
    return localPageViews >= options.pageViews;
  }

  private getDelayedPromptOptions(
    promptOptions: AppUserConfigPromptOptions | undefined,
    type: DelayedPromptTypeValue,
  ): DelayedPromptOptions {
    const defaultOptions = {
      enabled: false,
      autoPrompt: false,
      timeDelay: SERVER_CONFIG_DEFAULTS_PROMPT_DELAYS.timeDelay,
      pageViews: SERVER_CONFIG_DEFAULTS_PROMPT_DELAYS.pageViews,
    };

    if (!promptOptions || !promptOptions.native || !promptOptions.slidedown) {
      // default
      return defaultOptions;
    }

    switch (type) {
      case DelayedPromptType.Native: {
        const nativePromptOptions = promptOptions.native;
        return {
          enabled: nativePromptOptions?.enabled,
          autoPrompt: nativePromptOptions?.autoPrompt,
          timeDelay: nativePromptOptions?.timeDelay,
          pageViews: nativePromptOptions?.pageViews,
        };
      }
      case DelayedPromptType.Push:
      case DelayedPromptType.Category:
      case DelayedPromptType.Email:
      case DelayedPromptType.Sms:
      case DelayedPromptType.SmsAndEmail: {
        const { userConfig } = this.context.appConfig;
        const options = PromptsHelper.getFirstSlidedownPromptOptionsWithType(
          userConfig.promptOptions?.slidedown?.prompts || [],
          type,
        );
        return {
          enabled: !!options,
          autoPrompt: !!options?.autoPrompt,
          timeDelay: options?.delay?.timeDelay,
          pageViews: options?.delay?.pageViews,
        };
      }
      default:
        return defaultOptions;
    }
  }
}
