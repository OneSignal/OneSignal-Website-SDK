import type { TagCategory } from 'src/page/tags';
import {
  ConfigIntegrationKind,
  type AppUserConfig,
  type ConfigIntegrationKindValue,
  type ServerAppConfig,
  type ServiceWorkerConfigParams,
} from 'src/shared/config';
import {
  CONFIG_DEFAULTS_SLIDEDOWN_OPTIONS,
  SERVER_CONFIG_DEFAULTS_PROMPT_DELAYS,
  SERVER_CONFIG_DEFAULTS_SLIDEDOWN,
} from 'src/shared/constants';
import { getValueOrDefault, valueOrDefault } from '../helpers/general';
import {
  DelayedPromptType,
  type AppUserConfigCustomLinkOptions,
  type AppUserConfigPromptOptions,
  type ServerAppPromptConfig,
} from '../prompts';
import {
  getPromptOptionsForDashboardConfiguration,
  isSlidedownAutoPromptConfigured,
} from './config-prompt';

const MAX_CATEGORIES = 10;

const IntegrationConfigurationKind = {
  /**
   * Configuration comes from the dashboard only.
   */
  Dashboard: 0,
  /**
   * Configuration comes from user-provided JavaScript code only.
   */
  JavaScript: 1,
} as const;

type IntegrationConfigurationKindValue =
  (typeof IntegrationConfigurationKind)[keyof typeof IntegrationConfigurationKind];

interface IntegrationCapabilities {
  configuration: IntegrationConfigurationKindValue;
}

export function getConfigIntegrationKind(
  serverConfig: ServerAppConfig,
): ConfigIntegrationKindValue {
  if (serverConfig.config.integration)
    return serverConfig.config.integration.kind;
  return ConfigIntegrationKind.Custom;
}

/**
 * Describes how to merge a dashboard-set subdomain with a/lack of user-supplied subdomain.
 */
export function hasUnsupportedSubdomainForConfigIntegrationKind(
  configIntegrationKind: ConfigIntegrationKindValue,
  userConfig: AppUserConfig,
  serverConfig: ServerAppConfig,
): boolean {
  const integrationCapabilities = getIntegrationCapabilities(
    configIntegrationKind,
  );

  switch (integrationCapabilities.configuration) {
    case IntegrationConfigurationKind.Dashboard:
      return serverConfig.config.siteInfo.proxyOriginEnabled;
    case IntegrationConfigurationKind.JavaScript:
      return !!userConfig.subdomainName;
  }
}

export function getIntegrationCapabilities(
  integration: ConfigIntegrationKindValue,
): IntegrationCapabilities {
  switch (integration) {
    case ConfigIntegrationKind.Custom:
    case ConfigIntegrationKind.WordPress:
      return { configuration: IntegrationConfigurationKind.JavaScript };
    default:
      return { configuration: IntegrationConfigurationKind.Dashboard };
  }
}

export function getUserConfigForConfigIntegrationKind(
  configIntegrationKind: ConfigIntegrationKindValue,
  userConfig: AppUserConfig,
  serverConfig: ServerAppConfig,
): AppUserConfig {
  const integrationCapabilities = getIntegrationCapabilities(
    configIntegrationKind,
  );
  switch (integrationCapabilities.configuration) {
    case IntegrationConfigurationKind.Dashboard: {
      /*
           Ignores code-based initialization configuration and uses dashboard configuration only.
          */
      const { path, serviceWorkerPath, serviceWorkerParam } =
        getServiceWorkerValues(userConfig, serverConfig);

      return {
        appId: serverConfig.app_id,
        autoRegister: false,
        autoResubscribe: serverConfig.config.autoResubscribe,
        path,
        serviceWorkerPath,
        serviceWorkerParam,
        subdomainName: serverConfig.config.siteInfo.proxyOrigin,
        promptOptions: getPromptOptionsForDashboardConfiguration(serverConfig),
        welcomeNotification: {
          disable: !serverConfig.config.welcomeNotification.enable,
          title: serverConfig.config.welcomeNotification.title,
          message: serverConfig.config.welcomeNotification.message,
          url: serverConfig.config.welcomeNotification.url,
        },
        notifyButton: {
          enable: serverConfig.config.staticPrompts.bell.enabled,
          displayPredicate: serverConfig.config.staticPrompts.bell
            .hideWhenSubscribed
            ? () => !OneSignal.User.PushSubscription.optedIn
            : null,
          size: serverConfig.config.staticPrompts.bell.size,
          position: serverConfig.config.staticPrompts.bell.location,
          showCredit: false,
          offset: {
            bottom: `${serverConfig.config.staticPrompts.bell.offset.bottom}px`,
            left: `${serverConfig.config.staticPrompts.bell.offset.left}px`,
            right: `${serverConfig.config.staticPrompts.bell.offset.right}px`,
          },
          colors: {
            'circle.background':
              serverConfig.config.staticPrompts.bell.color.main,
            'circle.foreground':
              serverConfig.config.staticPrompts.bell.color.accent,
            'badge.background': 'black',
            'badge.foreground': 'white',
            'badge.bordercolor': 'black',
            'pulse.color': serverConfig.config.staticPrompts.bell.color.accent,
            'dialog.button.background.hovering':
              serverConfig.config.staticPrompts.bell.color.main,
            'dialog.button.background.active':
              serverConfig.config.staticPrompts.bell.color.main,
            'dialog.button.background':
              serverConfig.config.staticPrompts.bell.color.main,
            'dialog.button.foreground': 'white',
          },
          text: {
            'tip.state.unsubscribed':
              serverConfig.config.staticPrompts.bell.tooltip.unsubscribed,
            'tip.state.subscribed':
              serverConfig.config.staticPrompts.bell.tooltip.subscribed,
            'tip.state.blocked':
              serverConfig.config.staticPrompts.bell.tooltip.blocked,
            'message.prenotify':
              serverConfig.config.staticPrompts.bell.tooltip.unsubscribed,
            'message.action.subscribing':
              serverConfig.config.staticPrompts.bell.message.subscribing,
            'message.action.subscribed':
              serverConfig.config.staticPrompts.bell.message.subscribing,
            'message.action.resubscribed':
              serverConfig.config.staticPrompts.bell.message.subscribing,
            'message.action.unsubscribed':
              serverConfig.config.staticPrompts.bell.message.unsubscribing,
            'dialog.main.title':
              serverConfig.config.staticPrompts.bell.dialog.main.title,
            'dialog.main.button.subscribe':
              serverConfig.config.staticPrompts.bell.dialog.main
                .subscribeButton,
            'dialog.main.button.unsubscribe':
              serverConfig.config.staticPrompts.bell.dialog.main
                .unsubscribeButton,
            'dialog.blocked.title':
              serverConfig.config.staticPrompts.bell.dialog.blocked.title,
            'dialog.blocked.message':
              serverConfig.config.staticPrompts.bell.dialog.blocked.message,
          },
        },
        persistNotification: serverConfig.config.notificationBehavior
          ? serverConfig.config.notificationBehavior.display.persist
          : undefined,
        webhooks: {
          cors: serverConfig.config.webhooks.corsEnable,
          'notification.willDisplay':
            serverConfig.config.webhooks.notificationDisplayedHook,
          'notification.clicked':
            serverConfig.config.webhooks.notificationClickedHook,
          'notification.dismissed':
            serverConfig.config.webhooks.notificationDismissedHook,
        },
        notificationClickHandlerMatch: serverConfig.config.notificationBehavior
          ? serverConfig.config.notificationBehavior.click.match
          : undefined,
        notificationClickHandlerAction: serverConfig.config.notificationBehavior
          ? serverConfig.config.notificationBehavior.click.action
          : undefined,
        outcomes: {
          direct: serverConfig.config.outcomes.direct,
          indirect: {
            enabled: serverConfig.config.outcomes.indirect.enabled,
            influencedTimePeriodMin:
              serverConfig.config.outcomes.indirect.notification_attribution
                .minutes_since_displayed,
            influencedNotificationsLimit:
              serverConfig.config.outcomes.indirect.notification_attribution
                .limit,
          },
          unattributed: serverConfig.config.outcomes.unattributed,
        },
      };
    }
    case IntegrationConfigurationKind.JavaScript: {
      /*
            Ignores dashboard configuration and uses code-based configuration only.
            Except injecting some default values for prompts.
          */
      const defaultServiceWorkerParam = { scope: '/' };
      const defaultServiceWorkerPath = 'OneSignalSDKWorker.js';

      const config = {
        ...userConfig,
        promptOptions: injectDefaultsIntoPromptOptions(
          userConfig.promptOptions,
          serverConfig.config.staticPrompts,
          userConfig,
        ),
        ...{
          serviceWorkerParam: !!userConfig.serviceWorkerParam
            ? userConfig.serviceWorkerParam
            : defaultServiceWorkerParam,
          serviceWorkerPath: !!userConfig.serviceWorkerPath
            ? userConfig.serviceWorkerPath
            : defaultServiceWorkerPath,
          path: !!userConfig.path ? userConfig.path : '/',
        },
        outcomes: {
          direct: serverConfig.config.outcomes.direct,
          indirect: {
            enabled: serverConfig.config.outcomes.indirect.enabled,
            influencedTimePeriodMin:
              serverConfig.config.outcomes.indirect.notification_attribution
                .minutes_since_displayed,
            influencedNotificationsLimit:
              serverConfig.config.outcomes.indirect.notification_attribution
                .limit,
          },
          unattributed: serverConfig.config.outcomes.unattributed,
        },
      };

      // eslint-disable-next-line no-prototype-builtins
      if (userConfig.hasOwnProperty('autoResubscribe')) {
        config.autoResubscribe = !!userConfig.autoResubscribe;
        // eslint-disable-next-line no-prototype-builtins
      } else if (userConfig.hasOwnProperty('autoRegister')) {
        config.autoResubscribe = !!userConfig.autoRegister;
      } else {
        config.autoResubscribe = !!serverConfig.config.autoResubscribe;
      }

      return config;
    }
  }
}

function getServiceWorkerValues(
  userConfig: AppUserConfig,
  serverConfig: ServerAppConfig,
): ServiceWorkerConfigParams {
  const useUserOverride = userConfig.serviceWorkerOverrideForTypical;

  const path = useUserOverride
    ? valueOrDefault(userConfig.path, serverConfig.config.serviceWorker.path)
    : serverConfig.config.serviceWorker.path;

  const serviceWorkerParam = useUserOverride
    ? valueOrDefault(userConfig.serviceWorkerParam, {
        scope: serverConfig.config.serviceWorker.registrationScope,
      })
    : { scope: serverConfig.config.serviceWorker.registrationScope };

  const serviceWorkerPath = useUserOverride
    ? valueOrDefault(
        userConfig.serviceWorkerPath,
        serverConfig.config.serviceWorker.workerName,
      )
    : serverConfig.config.serviceWorker.workerName;

  return {
    path,
    serviceWorkerParam,
    serviceWorkerPath,
  };
}

/**
 * Used for Custom Code Integration Type
 * @param  {AppUserConfigPromptOptions|undefined} promptOptions
 * @param  {ServerAppPromptConfig} defaultsFromServer
 * @param  {AppUserConfig} wholeUserConfig
 * @returns AppUserConfigPromptOptions
 */
function injectDefaultsIntoPromptOptions(
  promptOptions: AppUserConfigPromptOptions | undefined,
  defaultsFromServer: ServerAppPromptConfig,
  wholeUserConfig: AppUserConfig,
): AppUserConfigPromptOptions | undefined {
  let customlinkUser: AppUserConfigCustomLinkOptions = { enabled: false };
  if (promptOptions && promptOptions.customlink) {
    customlinkUser = promptOptions.customlink;
  }
  const customlinkDefaults = defaultsFromServer.customlink;
  const promptOptionsConfig: AppUserConfigPromptOptions = {
    ...promptOptions,
    customlink: {
      enabled: valueOrDefault(
        customlinkUser.enabled,
        customlinkDefaults.enabled,
      ),
      style: valueOrDefault(customlinkUser.style, customlinkDefaults.style),
      size: valueOrDefault(customlinkUser.size, customlinkDefaults.size),
      unsubscribeEnabled: valueOrDefault(
        customlinkUser.unsubscribeEnabled,
        customlinkDefaults.unsubscribeEnabled,
      ),
      text: {
        subscribe: valueOrDefault(
          customlinkUser.text ? customlinkUser.text.subscribe : undefined,
          customlinkDefaults.text.subscribe,
        ),
        unsubscribe: valueOrDefault(
          customlinkUser.text ? customlinkUser.text.unsubscribe : undefined,
          customlinkDefaults.text.unsubscribe,
        ),
        explanation: valueOrDefault(
          customlinkUser.text ? customlinkUser.text.explanation : undefined,
          customlinkDefaults.text.explanation,
        ),
      },
      color: {
        button: valueOrDefault(
          customlinkUser.color ? customlinkUser.color.button : undefined,
          customlinkDefaults.color.button,
        ),
        text: valueOrDefault(
          customlinkUser.color ? customlinkUser.color.text : undefined,
          customlinkDefaults.color.text,
        ),
      },
    },
  };

  if (promptOptionsConfig.slidedown) {
    promptOptionsConfig.slidedown.prompts =
      promptOptionsConfig.slidedown?.prompts?.map((promptOption) => {
        promptOption.type = valueOrDefault(
          promptOption.type,
          DelayedPromptType.Push,
        );

        if (promptOption.type === DelayedPromptType.Category) {
          promptOption.text = {
            ...promptOption.text,
            positiveUpdateButton: valueOrDefault(
              promptOption.text?.positiveUpdateButton,
              SERVER_CONFIG_DEFAULTS_SLIDEDOWN.categoryDefaults
                .positiveUpdateButton,
            ),
            negativeUpdateButton: getValueOrDefault(
              promptOption.text?.negativeUpdateButton,
              SERVER_CONFIG_DEFAULTS_SLIDEDOWN.categoryDefaults
                .negativeUpdateButton,
            ),
            updateMessage: getValueOrDefault(
              promptOption.text?.updateMessage,
              SERVER_CONFIG_DEFAULTS_SLIDEDOWN.categoryDefaults.updateMessage,
            ),
          };
        }

        promptOption.text = {
          ...promptOption.text,
          actionMessage: getValueOrDefault(
            promptOption.text?.actionMessage,
            SERVER_CONFIG_DEFAULTS_SLIDEDOWN.actionMessage,
          ),
          acceptButton: getValueOrDefault(
            promptOption.text?.acceptButton,
            SERVER_CONFIG_DEFAULTS_SLIDEDOWN.acceptButton,
          ),
          cancelButton: getValueOrDefault(
            promptOption.text?.cancelButton,
            SERVER_CONFIG_DEFAULTS_SLIDEDOWN.cancelButton,
          ),
          confirmMessage: getValueOrDefault(
            promptOption.text?.confirmMessage,
            SERVER_CONFIG_DEFAULTS_SLIDEDOWN.confirmMessage,
          ),
        };

        // default autoPrompt to true iff slidedown config exists but omitted the autoPrompt setting
        promptOption.autoPrompt = getValueOrDefault(
          promptOption.autoPrompt,
          true,
        );

        promptOption.delay = {
          pageViews: getValueOrDefault(
            promptOption.delay?.pageViews,
            SERVER_CONFIG_DEFAULTS_PROMPT_DELAYS.pageViews,
          ),
          timeDelay: getValueOrDefault(
            promptOption.delay?.timeDelay,
            SERVER_CONFIG_DEFAULTS_PROMPT_DELAYS.timeDelay,
          ),
        };

        if (promptOption.categories) {
          const { categories } = promptOption;
          promptOption.categories = limitCategoriesToMaxCount(
            categories,
            MAX_CATEGORIES,
          );
        }

        return promptOption;
      });
  } else {
    promptOptionsConfig.slidedown = { prompts: [] };
    promptOptionsConfig.slidedown.prompts = [CONFIG_DEFAULTS_SLIDEDOWN_OPTIONS];
  }

  if (promptOptionsConfig.native) {
    promptOptionsConfig.native.enabled = !!promptOptionsConfig.native.enabled;
    promptOptionsConfig.native.autoPrompt =
      // eslint-disable-next-line no-prototype-builtins
      promptOptionsConfig.native.hasOwnProperty('autoPrompt')
        ? !!promptOptionsConfig.native.enabled &&
          !!promptOptionsConfig.native.autoPrompt
        : !!promptOptionsConfig.native.enabled;
    promptOptionsConfig.native.pageViews = getValueOrDefault(
      promptOptionsConfig.native.pageViews,
      SERVER_CONFIG_DEFAULTS_PROMPT_DELAYS.pageViews,
    );
    promptOptionsConfig.native.timeDelay = getValueOrDefault(
      promptOptionsConfig.native.timeDelay,
      SERVER_CONFIG_DEFAULTS_PROMPT_DELAYS.timeDelay,
    );
  } else {
    promptOptionsConfig.native = {
      enabled: false,
      autoPrompt: false,
      pageViews: SERVER_CONFIG_DEFAULTS_PROMPT_DELAYS.pageViews,
      timeDelay: SERVER_CONFIG_DEFAULTS_PROMPT_DELAYS.timeDelay,
    };
  }

  /**
   * If autoRegister is true, show native prompt for https and slidedown for http ignoring any other related
   * prompt options.
   */
  if (wholeUserConfig.autoRegister === true) {
    //enable native prompt & make it autoPrompt
    promptOptionsConfig.native.enabled = true;
    promptOptionsConfig.native.autoPrompt = true;

    //leave slidedown settings without change
  }

  // sets top level `autoPrompt` to trigger autoprompt codepath in initialization / prompting flow
  promptOptionsConfig.autoPrompt =
    promptOptionsConfig.native.autoPrompt ||
    isSlidedownAutoPromptConfigured(promptOptionsConfig.slidedown.prompts);

  return promptOptionsConfig;
}

export function limitCategoriesToMaxCount(
  tagCategories: TagCategory[],
  max: number,
): TagCategory[] {
  return structuredClone(tagCategories).slice(0, max);
}
