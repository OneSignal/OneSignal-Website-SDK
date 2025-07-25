import { SERVER_CONFIG_DEFAULTS_PROMPT_DELAYS } from 'src/shared/constants';
import type { ServerAppConfig } from 'src/shared/models/AppConfig';
import type {
  AppUserConfigCustomLinkOptions,
  AppUserConfigPromptOptions,
  SlidedownPromptOptions,
} from 'src/shared/models/Prompts';
import { getValueOrDefault } from '../general';

/**
 * Used only with Dashboard Configuration
 * @param  {ServerAppConfig} serverConfig
 * @returns AppUserConfigPromptOptions
 */
export function getPromptOptionsForDashboardConfiguration(
  serverConfig: ServerAppConfig,
): AppUserConfigPromptOptions {
  const staticPrompts = serverConfig.config.staticPrompts;
  const native = staticPrompts.native
    ? {
        enabled: staticPrompts.native.enabled,
        autoPrompt:
          staticPrompts.native.enabled &&
          staticPrompts.native.autoPrompt !== false,
        pageViews: getValueOrDefault(
          staticPrompts.native.pageViews,
          SERVER_CONFIG_DEFAULTS_PROMPT_DELAYS.pageViews,
        ),
        timeDelay: getValueOrDefault(
          staticPrompts.native.timeDelay,
          SERVER_CONFIG_DEFAULTS_PROMPT_DELAYS.timeDelay,
        ),
      }
    : {
        enabled: false,
        autoPrompt: false,
        pageViews: SERVER_CONFIG_DEFAULTS_PROMPT_DELAYS.pageViews,
        timeDelay: SERVER_CONFIG_DEFAULTS_PROMPT_DELAYS.timeDelay,
      };

  const { prompts } = staticPrompts.slidedown;

  return {
    autoPrompt: native.autoPrompt || isSlidedownAutoPromptConfigured(prompts),
    native,
    slidedown: {
      prompts,
    },
    fullscreen: {
      enabled: staticPrompts.fullscreen.enabled,
      actionMessage: staticPrompts.fullscreen.actionMessage,
      acceptButton: staticPrompts.fullscreen.acceptButton,
      cancelButton: staticPrompts.fullscreen.cancelButton,
      title: staticPrompts.fullscreen.title,
      message: staticPrompts.fullscreen.message,
      caption: staticPrompts.fullscreen.caption,
      autoAcceptTitle: staticPrompts.fullscreen.autoAcceptTitle,
    },
    customlink: getCustomLinkConfig(serverConfig),
  };
}

export function isSlidedownAutoPromptConfigured(
  prompts: SlidedownPromptOptions[],
): boolean {
  if (!prompts) {
    return false;
  }

  for (let i = 0; i < prompts.length; i++) {
    if (prompts[i].autoPrompt) return true;
  }
  return false;
}

function getCustomLinkConfig(
  serverConfig: ServerAppConfig,
): AppUserConfigCustomLinkOptions {
  const initialState: AppUserConfigCustomLinkOptions = {
    enabled: false,
    style: 'button',
    size: 'medium',
    unsubscribeEnabled: false,
    text: {
      explanation: '',
      subscribe: '',
      unsubscribe: '',
    },
    color: {
      button: '',
      text: '',
    },
  };

  if (
    !serverConfig ||
    !serverConfig.config ||
    !serverConfig.config.staticPrompts ||
    !serverConfig.config.staticPrompts.customlink ||
    !serverConfig.config.staticPrompts.customlink.enabled
  ) {
    return initialState;
  }

  const customlink = serverConfig.config.staticPrompts.customlink;

  return {
    enabled: customlink.enabled,
    style: customlink.style,
    size: customlink.size,
    unsubscribeEnabled: customlink.unsubscribeEnabled,
    text: customlink.text
      ? {
          subscribe: customlink.text.subscribe,
          unsubscribe: customlink.text.unsubscribe,
          explanation: customlink.text.explanation,
        }
      : initialState.text,
    color: customlink.color
      ? {
          button: customlink.color.button,
          text: customlink.color.text,
        }
      : initialState.color,
  };
}
