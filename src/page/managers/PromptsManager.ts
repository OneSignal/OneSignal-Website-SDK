import type { ContextInterface } from 'src/shared/context/types';
import { delay } from 'src/shared/helpers/general';
import { registerForPushNotifications } from 'src/shared/helpers/init';
import { getLocalPageViewCount } from 'src/shared/helpers/localStorage';
import {
  CONFIG_DEFAULTS_SLIDEDOWN_OPTIONS,
  DelayedPromptType,
  SERVER_CONFIG_DEFAULTS_PROMPT_DELAYS,
} from 'src/shared/prompts/constants';
import { getFirstSlidedownPromptOptionsWithType } from 'src/shared/prompts/helpers';
import type {
  AppUserConfigPromptOptions,
  DelayedPromptOptions,
  DelayedPromptTypeValue,
  SlidedownPromptOptions,
} from 'src/shared/prompts/types';
import { Browser } from 'src/shared/useragent/constants';
import {
  getBrowserName,
  getBrowserVersion,
  isMobileBrowser,
  isTabletBrowser,
  requiresUserInteraction,
} from 'src/shared/useragent/detect';
import { logMethodCall } from 'src/shared/utils/utils';
import { markPromptDismissedWithType } from '../../shared/helpers/DismissHelper';
import Log from '../../shared/libraries/Log';
import OneSignalEvent from '../../shared/services/OneSignalEvent';
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
  private _isNativePromptShowing: boolean;
  private _context: ContextInterface;
  private _eventHooksInstalled: boolean;

  constructor(context: ContextInterface) {
    this._isNativePromptShowing = false;
    this._context = context;
    this._eventHooksInstalled = false;
  }

  private _shouldForceSlidedownOverNative(): boolean {
    const browserVersion = getBrowserVersion();
    return (
      (getBrowserName() === Browser.Chrome &&
        browserVersion >= 63 &&
        (isTabletBrowser() || isMobileBrowser())) ||
      requiresUserInteraction()
    );
  }

  public async _spawnAutoPrompts() {
    // user config prompt options
    const userPromptOptions = OneSignal.config?.userConfig.promptOptions;

    /*
     * Chrome 63 on Android permission prompts are permanent without a dismiss option. To avoid
     * permanent blocks, we want to replace sites automatically showing the native browser request
     * with a slide prompt first.
     * Same for Safari 12.1+ & Firefox 72+. It requires user interaction to request notification permissions.
     * It simply wouldn't work to try to show native prompt from script.
     */
    const forceSlidedownOverNative = this._shouldForceSlidedownOverNative();

    // show native prompt
    const nativePromptOptions = this._getDelayedPromptOptions(
      userPromptOptions,
      DelayedPromptType._Native,
    );
    const isPageViewConditionMetForNative: boolean =
      this._isPageViewConditionMet(nativePromptOptions);
    const conditionMetWithNativeOptions =
      nativePromptOptions.enabled && isPageViewConditionMetForNative;
    const forceSlidedownWithNativeOptions =
      forceSlidedownOverNative && conditionMetWithNativeOptions;

    if (conditionMetWithNativeOptions && !forceSlidedownWithNativeOptions) {
      this._internalShowDelayedPrompt(
        DelayedPromptType._Native,
        nativePromptOptions.timeDelay || 0,
      );
      return;
    }

    // if slidedown not configured, condition met with native options, & should force slidedown over native:
    const isPushSlidedownConfigured = !!getFirstSlidedownPromptOptionsWithType(
      userPromptOptions?.slidedown?.prompts,
      DelayedPromptType._Push,
    );

    if (forceSlidedownWithNativeOptions && !isPushSlidedownConfigured) {
      this._internalShowDelayedPrompt(
        DelayedPromptType._Push,
        nativePromptOptions.timeDelay || 0,
      );
    }

    // spawn slidedown prompts
    const prompts = userPromptOptions?.slidedown?.prompts;
    if (!!prompts && prompts?.length > 0) {
      for (let i = 0; i < prompts.length; i++) {
        const promptOptions = prompts[i];

        const slidedownPromptOptions = this._getDelayedPromptOptions(
          userPromptOptions,
          promptOptions.type,
        );
        const isPageViewConditionMetForSlidedown: boolean =
          this._isPageViewConditionMet(slidedownPromptOptions);
        const conditionMetWithSlidedownOptions =
          slidedownPromptOptions.enabled && isPageViewConditionMetForSlidedown;

        const options: AutoPromptOptions = {
          slidedownPromptOptions: promptOptions,
        };

        if (conditionMetWithSlidedownOptions) {
          this._internalShowDelayedPrompt(
            promptOptions.type,
            slidedownPromptOptions.timeDelay || 0,
            options,
          );
        }
      }
    }
  }

  public async _internalShowDelayedPrompt(
    type: DelayedPromptTypeValue,
    timeDelaySeconds: number,
    options?: AutoPromptOptions,
  ): Promise<void> {
    logMethodCall('internalShowDelayedPrompt');
    if (typeof timeDelaySeconds !== 'number') {
      Log._error('internalShowDelayedPrompt: timeDelay not a number');
      return;
    }

    if (requiresUserInteraction() && type === DelayedPromptType._Native) {
      type = DelayedPromptType._Push; // Push Slidedown for cases where user interaction is needed
    }

    if (timeDelaySeconds > 0) {
      await delay(timeDelaySeconds * 1_000);
    }

    switch (type) {
      case DelayedPromptType._Native:
        await this._internalShowNativePrompt();
        break;
      case DelayedPromptType._Push:
        await this._internalShowSlidedownPrompt(options);
        break;
      case DelayedPromptType._Category:
        await this._internalShowCategorySlidedown(options);
        break;
      case DelayedPromptType._Sms:
        await this._internalShowSmsSlidedown(options);
        break;
      case DelayedPromptType._Email:
        await this._internalShowEmailSlidedown(options);
        break;
      case DelayedPromptType._SmsAndEmail:
        await this._internalShowSmsAndEmailSlidedown(options);
        break;
      default:
        Log._error('Invalid Delayed Prompt type');
    }
  }

  public async _internalShowNativePrompt(): Promise<boolean> {
    logMethodCall('internalShowNativePrompt');

    if (this._isNativePromptShowing) {
      Log._debug('Already showing autoprompt. Abort showing a native prompt.');
      return false;
    }

    this._isNativePromptShowing = true;
    const success = await registerForPushNotifications();
    this._isNativePromptShowing = false;
    markPromptDismissedWithType(DismissPrompt.Push);
    return success;
  }

  private async _internalShowSlidedownPrompt(
    options: AutoPromptOptions = { force: false },
  ): Promise<void> {
    logMethodCall('internalShowSlidedownPrompt');

    if (!options.slidedownPromptOptions) {
      options.slidedownPromptOptions = CONFIG_DEFAULTS_SLIDEDOWN_OPTIONS;
    }

    const sdkStylesLoadResult =
      await this._context._dynamicResourceLoader._loadSdkStylesheet();
    if (sdkStylesLoadResult !== ResourceLoadState.Loaded) {
      Log._debug(
        'Not showing slidedown permission message because styles failed to load.',
      );
      return;
    }

    if (!this._eventHooksInstalled) {
      this._installEventHooksForSlidedown();
    }

    await this._context._slidedownManager._createSlidedown(options);
  }

  public async _internalShowCategorySlidedown(
    options?: AutoPromptOptions,
  ): Promise<void> {
    logMethodCall('internalShowCategorySlidedown');
    await this._internalShowParticularSlidedown(
      DelayedPromptType._Category,
      options,
    );
  }

  public async _internalShowSmsSlidedown(
    options?: AutoPromptOptions,
  ): Promise<void> {
    logMethodCall('internalShowSmsSlidedown');
    await this._internalShowParticularSlidedown(
      DelayedPromptType._Sms,
      options,
    );
  }

  public async _internalShowEmailSlidedown(
    options?: AutoPromptOptions,
  ): Promise<void> {
    logMethodCall('internalShowEmailSlidedown');
    await this._internalShowParticularSlidedown(
      DelayedPromptType._Email,
      options,
    );
  }

  public async _internalShowSmsAndEmailSlidedown(
    options?: AutoPromptOptions,
  ): Promise<void> {
    logMethodCall('internalShowSmsAndEmailSlidedown');
    await this._internalShowParticularSlidedown(
      DelayedPromptType._SmsAndEmail,
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
  public async _internalShowParticularSlidedown(
    typeToPullFromConfig: DelayedPromptTypeValue,
    options?: AutoPromptOptions,
  ): Promise<void> {
    const prompts =
      this._context._appConfig.userConfig.promptOptions?.slidedown?.prompts;
    const slidedownPromptOptions =
      options?.slidedownPromptOptions ||
      getFirstSlidedownPromptOptionsWithType(prompts, typeToPullFromConfig);

    if (!slidedownPromptOptions) {
      if (typeToPullFromConfig !== DelayedPromptType._Push) {
        Log._error(
          `OneSignal: slidedown of type '${typeToPullFromConfig}' couldn't be shown. Check your configuration` +
            ` on the OneSignal dashboard or your custom code initialization.`,
        );
        return;
      } else {
        Log._warn(
          `The OneSignal 'push' slidedown will be shown with default text settings.` +
            ` To customize, see the OneSignal documentation.`,
        );
      }
    }

    await this._internalShowSlidedownPrompt({
      ...options,
      slidedownPromptOptions,
    });
  }

  public _installEventHooksForSlidedown(): void {
    this._eventHooksInstalled = true;

    OneSignal._emitter.on(Slidedown.EVENTS.SHOWN, () => {
      this._context._slidedownManager._setIsSlidedownShowing(true);
    });
    OneSignal._emitter.on(Slidedown.EVENTS.CLOSED, () => {
      this._context._slidedownManager._setIsSlidedownShowing(false);
      this._context._slidedownManager._showQueued();
    });
    OneSignal._emitter.on(Slidedown.EVENTS.ALLOW_CLICK, async () => {
      await this._context._slidedownManager._handleAllowClick();
      OneSignalEvent._trigger(
        OneSignal.EVENTS.TEST_FINISHED_ALLOW_CLICK_HANDLING,
      );
    });
    OneSignal._emitter.on(Slidedown.EVENTS.CANCEL_CLICK, () => {
      if (!this._context._slidedownManager._slidedown) {
        return;
      }

      const type = this._context._slidedownManager._slidedown?._options.type;
      switch (type) {
        case DelayedPromptType._Push:
        case DelayedPromptType._Category:
          Log._debug(
            'Setting flag to not show the slidedown to the user again.',
          );
          markPromptDismissedWithType(DismissPrompt.Push);
          break;
        default:
          Log._debug(
            'Setting flag to not show the slidedown to the user again.',
          );
          markPromptDismissedWithType(DismissPrompt.NonPush);
          break;
      }
    });
  }

  private _isPageViewConditionMet(options?: DelayedPromptOptions): boolean {
    if (!options || typeof options.pageViews === 'undefined') {
      return false;
    }

    if (!options.autoPrompt || !options.enabled) {
      return false;
    }

    const localPageViews = getLocalPageViewCount();
    return localPageViews >= options.pageViews;
  }

  private _getDelayedPromptOptions(
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
      case DelayedPromptType._Native: {
        const nativePromptOptions = promptOptions.native;
        return {
          enabled: nativePromptOptions?.enabled,
          autoPrompt: nativePromptOptions?.autoPrompt,
          timeDelay: nativePromptOptions?.timeDelay,
          pageViews: nativePromptOptions?.pageViews,
        };
      }
      case DelayedPromptType._Push:
      case DelayedPromptType._Category:
      case DelayedPromptType._Email:
      case DelayedPromptType._Sms:
      case DelayedPromptType._SmsAndEmail: {
        const { userConfig } = this._context._appConfig;
        const options = getFirstSlidedownPromptOptionsWithType(
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
