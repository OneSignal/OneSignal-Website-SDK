import { AppUserConfig, AppConfig, ConfigIntegrationKind, NotificationClickMatchBehavior, NotificationClickActionBehavior, ServerAppConfig } from '../models/AppConfig';
import OneSignalApi from '../OneSignalApi';
import { SdkInitError, SdkInitErrorKind } from '../errors/SdkInitError';

import SdkEnvironment from './SdkEnvironment';
import {WindowEnvironmentKind} from "../models/WindowEnvironmentKind";
import {contains, isValidUuid} from "../utils";

export enum IntegrationConfigurationKind {
  /**
   * Configuration comes from the dashboard only.
   */
  Dashboard,
  /**
   * Configuration comes from user-provided JavaScript code only.
   */
  JavaScript
}

export interface IntegrationCapabilities {
  configuration: IntegrationConfigurationKind;
}

/**
 * Handles downloading settings from OneSignal and performing any other initialization-related tasks.
 */
export default class ConfigManager {
  /**
   * Downloads configuration from the OneSignal dashboard, merges it with user-supplied configuration from JavaScript
   * code, and returns Web SDK-specific configuration.
   */
  public async getAppConfig(userConfig: AppUserConfig): Promise<AppConfig> {
    try {
      if (!userConfig || !userConfig.appId || !isValidUuid(userConfig.appId))
        throw new SdkInitError(SdkInitErrorKind.InvalidAppId);

      const serverConfig = await OneSignalApi.downloadServerAppConfig(userConfig.appId);
      const appConfig = this.getMergedConfig(userConfig, serverConfig);
      ConfigManager.checkRestrictedOrigin(appConfig);
      return appConfig;
    }
    catch (e) {
      if (e) {
        if (e.code === 1)
          throw new SdkInitError(SdkInitErrorKind.InvalidAppId);
        else if (e.code === 2)
          throw new SdkInitError(SdkInitErrorKind.AppNotConfiguredForWebPush);
      }
      throw e;
    }
  }

  private static checkRestrictedOrigin(appConfig: AppConfig) {
    if (appConfig.restrictedOriginEnabled) {
      if (SdkEnvironment.getWindowEnv() !== WindowEnvironmentKind.ServiceWorker) {
        if (window.top === window &&
          !contains(window.location.hostname, ".os.tc") &&
          !contains(window.location.hostname, ".onesignal.com") &&
          !ConfigManager.doesCurrentOriginMatchConfigOrigin(appConfig.origin)) {
          throw new SdkInitError(SdkInitErrorKind.WrongSiteUrl, {
            siteUrl: appConfig.origin
          });
        }
      }
    }
  }

  private static doesCurrentOriginMatchConfigOrigin(configOrigin: string): boolean {
    try {
      return location.origin === new URL(configOrigin).origin;
    } catch (e) {
      return false;
    }
  }

  private getIntegrationCapabilities(integration: ConfigIntegrationKind): IntegrationCapabilities {
    switch (integration) {
      case ConfigIntegrationKind.Custom:
      case ConfigIntegrationKind.WordPress:
        return {configuration: IntegrationConfigurationKind.JavaScript};
      default:
        return {configuration: IntegrationConfigurationKind.Dashboard};
    }
  }

  /**
   * Merges configuration downloaded from the OneSignal dashboard with user-provided JavaScript configuration to produce
   * a final web SDK-specific configuration.
   */
  public getMergedConfig(userConfig: AppUserConfig, serverConfig: ServerAppConfig): AppConfig {
    const configIntegrationKind = this.getConfigIntegrationKind(serverConfig);
    return {
      appId: serverConfig.app_id,
      subdomain: this.getSubdomainForConfigIntegrationKind(configIntegrationKind, userConfig, serverConfig),
      origin: serverConfig.config.origin,
      httpUseOneSignalCom: serverConfig.config.http_use_onesignal_com,
      cookieSyncEnabled: serverConfig.features.cookie_sync.enable,
      restrictedOriginEnabled: serverConfig.features.restrict_origin && serverConfig.features.restrict_origin.enable,
      metrics: {
        enable: serverConfig.features.metrics.enable,
        mixpanelReportingToken: serverConfig.features.metrics.mixpanel_reporting_token
      },
      safariWebId: serverConfig.config.safari_web_id,
      vapidPublicKey: serverConfig.config.vapid_public_key,
      onesignalVapidPublicKey: serverConfig.config.onesignal_vapid_public_key,
      emailAuthRequired: serverConfig.features.email && serverConfig.features.email.require_auth,
      userConfig: this.getUserConfigForConfigIntegrationKind(configIntegrationKind, userConfig, serverConfig),
    };
  }

  private getConfigIntegrationKind(serverConfig: ServerAppConfig): ConfigIntegrationKind {
    if (serverConfig.config.integration)
      return serverConfig.config.integration.kind;
    return ConfigIntegrationKind.Custom;
  }

  private getUserConfigForConfigIntegrationKind(
    configIntegrationKind: ConfigIntegrationKind,
    userConfig: AppUserConfig,
    serverConfig: ServerAppConfig
  ): AppUserConfig {
    const integrationCapabilities = this.getIntegrationCapabilities(configIntegrationKind);
    switch (integrationCapabilities.configuration) {
      case IntegrationConfigurationKind.Dashboard:
       /*
         Ignores code-based initialization configuration and uses dashboard configuration only.
        */
        return {
          appId: serverConfig.app_id,
          autoRegister: false,
          path: serverConfig.config.serviceWorker.path,
          serviceWorkerPath: serverConfig.config.serviceWorker.workerName,
          serviceWorkerUpdaterPath: serverConfig.config.serviceWorker.updaterWorkerName,
          serviceWorkerParam: { scope: serverConfig.config.serviceWorker.registrationScope },
          subdomainName: serverConfig.config.siteInfo.proxyOrigin,
          promptOptions: {
            slidedown: {
              autoPrompt: serverConfig.config.staticPrompts.slidedown.enabled,
              actionMessage: serverConfig.config.staticPrompts.slidedown.actionMessage,
              acceptButtonText: serverConfig.config.staticPrompts.slidedown.acceptButton,
              cancelButtonText: serverConfig.config.staticPrompts.slidedown.cancelButton
            },
            fullscreen: {
              actionMessage: serverConfig.config.staticPrompts.fullscreen.actionMessage,
              acceptButton: serverConfig.config.staticPrompts.fullscreen.acceptButton,
              cancelButton: serverConfig.config.staticPrompts.fullscreen.cancelButton,
              title: serverConfig.config.staticPrompts.fullscreen.title,
              message: serverConfig.config.staticPrompts.fullscreen.message,
              caption: serverConfig.config.staticPrompts.fullscreen.caption,
              autoAcceptTitle: serverConfig.config.staticPrompts.fullscreen.autoAcceptTitle,
            }
          },
          welcomeNotification: {
            disable: !serverConfig.config.welcomeNotification.enable,
            title: serverConfig.config.welcomeNotification.title,
            message: serverConfig.config.welcomeNotification.message,
            url: serverConfig.config.welcomeNotification.url
          },
          notifyButton: {
            enable: serverConfig.config.staticPrompts.bell.enabled,
            displayPredicate: serverConfig.config.staticPrompts.bell.hideWhenSubscribed ?
              () => {
                return OneSignal.isPushNotificationsEnabled()
                  .then(isPushEnabled => {
                      /* The user is subscribed, so we want to return "false" to hide the notify button */
                      return !isPushEnabled;
                  });
              } :
              null,
            size: serverConfig.config.staticPrompts.bell.size,
            position: serverConfig.config.staticPrompts.bell.location,
            showCredit: false,
            offset: {
              bottom: serverConfig.config.staticPrompts.bell.offset.bottom + 'px',
              left: serverConfig.config.staticPrompts.bell.offset.left + 'px',
              right: serverConfig.config.staticPrompts.bell.offset.right + 'px'
            },
            colors: {
              'circle.background': serverConfig.config.staticPrompts.bell.color.main,
              'circle.foreground': serverConfig.config.staticPrompts.bell.color.accent,
              'badge.background': 'black',
              'badge.foreground': 'white',
              'badge.bordercolor': 'black',
              'pulse.color': serverConfig.config.staticPrompts.bell.color.accent,
              'dialog.button.background.hovering': serverConfig.config.staticPrompts.bell.color.main,
              'dialog.button.background.active': serverConfig.config.staticPrompts.bell.color.main,
              'dialog.button.background': serverConfig.config.staticPrompts.bell.color.main,
              'dialog.button.foreground': 'white',
            },
            text: {
              'tip.state.unsubscribed': serverConfig.config.staticPrompts.bell.tooltip.unsubscribed,
              'tip.state.subscribed': serverConfig.config.staticPrompts.bell.tooltip.subscribed,
              'tip.state.blocked': serverConfig.config.staticPrompts.bell.tooltip.blocked,
              'message.prenotify': serverConfig.config.staticPrompts.bell.tooltip.unsubscribed,
              'message.action.subscribed': serverConfig.config.staticPrompts.bell.message.subscribing,
              'message.action.resubscribed': serverConfig.config.staticPrompts.bell.message.subscribing,
              'message.action.unsubscribed': serverConfig.config.staticPrompts.bell.message.unsubscribing,
              'dialog.main.title': serverConfig.config.staticPrompts.bell.dialog.main.title,
              'dialog.main.button.subscribe': serverConfig.config.staticPrompts.bell.dialog.main.subscribeButton,
              'dialog.main.button.unsubscribe': serverConfig.config.staticPrompts.bell.dialog.main.unsubscribeButton,
              'dialog.blocked.title': serverConfig.config.staticPrompts.bell.dialog.blocked.title,
              'dialog.blocked.message': serverConfig.config.staticPrompts.bell.dialog.blocked.message,
            }
          },
          persistNotification: serverConfig.config.notificationBehavior.display.persist,
          webhooks: {
            cors: serverConfig.config.webhooks.corsEnable,
            'notification.displayed': serverConfig.config.webhooks.notificationDisplayedHook,
            'notification.clicked': serverConfig.config.webhooks.notificationClickedHook,
            'notification.dismissed': serverConfig.config.webhooks.notificationDismissedHook,
          },
          notificationClickHandlerMatch: serverConfig.config.notificationBehavior.click.match,
          notificationClickHandlerAction: serverConfig.config.notificationBehavior.click.action,
          allowLocalhostAsSecureOrigin: serverConfig.config.setupBehavior.allowLocalhostAsSecureOrigin,
          requiresUserPrivacyConsent: userConfig.requiresUserPrivacyConsent
        };
      case IntegrationConfigurationKind.JavaScript:
        /*
          Ignores dashboard configuration and uses code-based configuration only.
        */
        return {
          ...userConfig,
          ...{
          serviceWorkerParam: typeof OneSignal !== 'undefined' && !!OneSignal.SERVICE_WORKER_PARAM
            ? OneSignal.SERVICE_WORKER_PARAM
            : { scope: '/' },
          serviceWorkerPath: typeof OneSignal !== 'undefined' && !!OneSignal.SERVICE_WORKER_PATH
              ? OneSignal.SERVICE_WORKER_PATH
              : 'OneSignalSDKWorker.js',
          serviceWorkerUpdaterPath: typeof OneSignal !== 'undefined' && !!OneSignal.SERVICE_WORKER_UPDATER_PATH
              ? OneSignal.SERVICE_WORKER_UPDATER_PATH
              : 'OneSignalSDUpdaterKWorker.js',
          path: !!userConfig.path ? userConfig.path : '/'
          }
        };
    }
  }

  /**
   * Describes how to merge a dashboard-set subdomain with a/lack of user-supplied subdomain.
   */
  private getSubdomainForConfigIntegrationKind(
    configIntegrationKind: ConfigIntegrationKind,
    userConfig: AppUserConfig,
    serverConfig: ServerAppConfig
  ): string {
    const integrationCapabilities = this.getIntegrationCapabilities(configIntegrationKind);
    let userValue = userConfig.subdomainName;
    let serverValue = '';

    switch (integrationCapabilities.configuration) {
      case IntegrationConfigurationKind.Dashboard:
        serverValue = serverConfig.config.siteInfo.proxyOriginEnabled ?
          serverConfig.config.siteInfo.proxyOrigin :
          undefined;
        break;
      case IntegrationConfigurationKind.JavaScript:
        serverValue = serverConfig.config.subdomain;
        break;
    }

    if (serverValue && !this.shouldUseServerConfigSubdomain(userValue, integrationCapabilities)) {
      return undefined;
    } else {
      return serverValue;
    }
  }

  private shouldUseServerConfigSubdomain(
    userProvidedSubdomain: string,
    capabilities: IntegrationCapabilities
  ): boolean {
    switch (capabilities.configuration) {
      case IntegrationConfigurationKind.Dashboard:
        /*
          Dashboard config using the new web config editor always takes precedence.
         */
        return true;
      case IntegrationConfigurationKind.JavaScript:
        /*
         * An HTTPS site may be using either a native push integration or a fallback
         * subdomain integration. Our SDK decides the integration based on whether
         * init option subdomainName appears and the site's protocol.
         *
         * To avoid having developers write JavaScript to customize the SDK,
         * configuration properties like subdomainName are downloaded on page start.
         *
         * New developers setting up web push can omit subdomainName, but existing
         * developers already having written code to configure OneSignal aren't
         * removing their code.
         *
         * When an HTTPS site is configured with a subdomain on the server-side, we do
         * not apply it even though we've downloaded this configuration unless the
         * user also declares it manually in their initialization code.
         */
        switch (location.protocol) {
          case 'https:':
            return !!userProvidedSubdomain;
          case 'http:':
            return true;
          default:
            return false;
        }
    }
  }
}
