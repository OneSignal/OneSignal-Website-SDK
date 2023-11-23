import { RecursivePartial } from '../../../src/shared/context/Utils';
import {
  ConfigIntegrationKind,
  ServerAppConfig,
  NotificationClickMatchBehavior,
  NotificationClickActionBehavior,
  AppUserConfig,
  AppConfig,
} from '../../../src/shared/models/AppConfig';
import { DelayedPromptType } from '../../../src/shared/models/Prompts';
import { APP_ID } from '../constants';
import deepmerge from 'deepmerge';
import ConfigManager from '../../../src/page/managers/ConfigManager';
import { TestEnvironmentConfig } from './TestEnvironment';

export default class TestContext {
  static getFakeServerAppConfig(
    configIntegrationKind: ConfigIntegrationKind,
    overrideServerConfig: RecursivePartial<ServerAppConfig> | null = null,
    appId: string = APP_ID,
  ): ServerAppConfig {
    if (configIntegrationKind === ConfigIntegrationKind.Custom) {
      return {
        success: true,
        version: 2,
        app_id: appId,
        features: {
          restrict_origin: {
            enable: true,
          },
          metrics: {
            enable: true,
            mixpanel_reporting_token: '7c2582e45a6ecf1501aa3ca7887f3673',
          },
          web_on_focus_enabled: true,
          session_threshold: 30,
        },
        config: {
          autoResubscribe: true,
          siteInfo: {
            name: 'localhost https',
            origin: 'https://localhost:3001',
            proxyOrigin: undefined,
            defaultIconUrl: null,
            proxyOriginEnabled: true,
          },
          integration: {
            kind: ConfigIntegrationKind.Custom,
          },
          staticPrompts: {
            native: {
              enabled: false,
              autoPrompt: false,
            },
            bell: {
              enabled: false,
              size: 'large',
              color: {
                main: 'red',
                accent: 'white',
              },
              dialog: {
                main: {
                  title: 'Manage Notifications',
                  subscribeButton: 'Subscribe',
                  unsubscribeButton: 'Unsubscribe',
                },
                blocked: {
                  title: 'Unblock Notifications',
                  message: 'Click here to learn how to unblock notifications.',
                },
              },
              offset: {
                left: 0,
                right: 0,
                bottom: 0,
              },
              message: {
                subscribing: 'Thanks for subscribing!',
                unsubscribing: "You won't receive notifications again",
              },
              tooltip: {
                blocked: "You've blocked notifications",
                subscribed: "You're subscribed to notifications",
                unsubscribed: 'Subscribe to notifications',
              },
              location: 'bottom-right',
              hideWhenSubscribed: false,
              customizeTextEnabled: true,
            },
            slidedown: {
              prompts: [
                {
                  type: DelayedPromptType.Push,
                  autoPrompt: false,
                  text: {
                    acceptButton: 'Allow',
                    cancelButton: 'No Thanks',
                    actionMessage:
                      "We'd like to send you notifications for the latest news and updates.",
                  },
                },
              ],
            },
            fullscreen: {
              enabled: false,
              title: 'example.com',
              caption: 'You can unsubscribe anytime',
              message: 'This is an example notification message.',
              acceptButton: 'Continue',
              cancelButton: 'No Thanks',
              actionMessage:
                "We'd like to send you notifications for the latest news and updates.",
              autoAcceptTitle: 'Click Allow',
              customizeTextEnabled: true,
            },
            customlink: {
              enabled: false,
              style: 'button',
              size: 'medium',
              color: {
                button: '#e54b4d',
                text: '#ffffff',
              },
              text: {
                subscribe: 'Subscribe to push notifications',
                unsubscribe: 'Unsubscribe from push notifications',
                explanation: '',
              },
              unsubscribeEnabled: true,
            },
          },
          webhooks: {
            enable: false,
          },
          serviceWorker: {
            customizationEnabled: false,
            path: '/',
            workerName: 'OneSignalSDKWorker.js',
            registrationScope: '/',
          },
          welcomeNotification: {
            enable: true,
            url: 'https://localhost:3001/?_osp=do_not_open',
            title: 'localhost https',
            message: 'Thanks for subscribing!',
            urlEnabled: false,
          },
          vapid_public_key:
            'BDPplk0FjgsEPIG7Gi2-zbjpBGgM_RJ4c99tWbNvxv7VSKIUV1KA7UUaRsTuBpcTEuaPMjvz_kd8rZuQcgMepng',
          onesignal_vapid_public_key:
            'BMzCIzYqtgz2Bx7S6aPVK6lDWets7kGm-pgo2H4RixFikUaNIoPqjPBBOEWMAfeFjuT9mAvbe-lckGi6vvNEiW0',
          origin: 'https://localhost:3001',
          subdomain: undefined,
          outcomes: {
            direct: {
              enabled: true,
            },
            indirect: {
              enabled: true,
              notification_attribution: {
                limit: 5,
                minutes_since_displayed: 60,
              },
            },
            unattributed: {
              enabled: true,
            },
          },
        },
        generated_at: 1531177265,
      };
    }

    const remoteConfigMockDefaults: ServerAppConfig = {
      success: true,
      version: 2,
      app_id: appId,
      features: {
        restrict_origin: {
          enable: false,
        },
        metrics: {
          enable: true,
          mixpanel_reporting_token: '7c2582e45a6ecf1501aa3ca7887f3673',
        },
        email: {
          require_auth: true,
        },
        web_on_focus_enabled: true,
        session_threshold: 30,
      },
      config: {
        origin: 'https://example.com',
        subdomain: undefined,
        http_use_onesignal_com: false,
        autoResubscribe: false,
        staticPrompts: {
          native: {
            enabled: false,
            autoPrompt: false,
          },
          bell: {
            size: 'large',
            color: {
              main: 'red',
              accent: 'white',
            },
            dialog: {
              main: {
                title: 'Manage Notifications',
                subscribeButton: 'Subscribe',
                unsubscribeButton: 'Unsubscribe',
              },
              blocked: {
                title: 'Unblock Notifications',
                message: 'Click here to learn how to unblock notifications.',
              },
            },
            offset: {
              left: 0,
              right: 0,
              bottom: 0,
            },
            enabled: true,
            message: {
              subscribing: 'Thanks for subscribing!',
              unsubscribing: "You won't receive notifications again",
            },
            tooltip: {
              blocked: "You've blocked notifications",
              subscribed: "You're subscribed to notifications",
              unsubscribed: 'Subscribe to notifications',
            },
            location: 'bottom-right',
            hideWhenSubscribed: false,
            customizeTextEnabled: true,
          },
          slidedown: {
            prompts: [
              {
                type: DelayedPromptType.Push,
                autoPrompt: true,
                text: {
                  acceptButton: 'Allow',
                  cancelButton: 'No Thanks',
                  actionMessage:
                    "We'd like to send you notifications for the latest news and updates.",
                },
              },
            ],
          },
          fullscreen: {
            title: 'example.com',
            caption: 'You can unsubscribe anytime',
            enabled: true,
            message: 'This is an example notification message.',
            acceptButton: 'Continue',
            cancelButton: 'No Thanks',
            actionMessage:
              "We'd like to send you notifications for the latest news and updates.",
            autoAcceptTitle: 'Click Allow',
            customizeTextEnabled: true,
          },
          customlink: {
            enabled: true,
            style: 'button',
            size: 'medium',
            color: {
              button: '#e54b4d',
              text: '#ffffff',
            },
            text: {
              subscribe: 'Subscribe to push notifications',
              unsubscribe: 'Unsubscribe from push notifications',
              explanation:
                'Get updates from all sorts of things that matter to you',
            },
            unsubscribeEnabled: true,
          },
        },
        siteInfo: {
          name: 'My Website',
          origin: 'https://www.site.com',
          proxyOrigin: undefined,
          defaultIconUrl: 'https://onesignal.com/images/notification_logo.png',
          proxyOriginEnabled: false,
        },
        webhooks: {
          enable: false,
          corsEnable: false,
          notificationClickedHook: undefined,
          notificationDismissedHook: undefined,
          notificationDisplayedHook: undefined,
        },
        integration: {
          kind: configIntegrationKind,
        },
        serviceWorker: {
          path: undefined,
          workerName: undefined,
          registrationScope: undefined,
          customizationEnabled: true,
        },
        setupBehavior: {
          allowLocalhostAsSecureOrigin: false,
        },
        welcomeNotification: {
          url: undefined,
          title: undefined,
          enable: false,
          message: undefined,
          urlEnabled: undefined,
        },
        notificationBehavior: {
          click: {
            match: NotificationClickMatchBehavior.Exact,
            action: NotificationClickActionBehavior.Navigate,
          },
          display: {
            persist: false,
          },
        },
        vapid_public_key:
          'BLJozaErc0QXdS7ykMyqniAcvfmdoziwfoSN-Mde_OckAbN_XrOC9Zt2Sfz4pD0UnYT5w3frWjF2iTTtjqEBgbE',
        onesignal_vapid_public_key:
          'BMzCIzYqtgz2Bx7S6aPVK6lDWets7kGm-pgo2H4RixFikUaNIoPqjPBBOEWMAfeFjuT9mAvbe-lckGi6vvNEiW0',
        safari_web_id:
          'web.onesignal.auto.017d7a1b-f1ef-4fce-a00c-21a546b5491d',
        outcomes: {
          direct: {
            enabled: true,
          },
          indirect: {
            enabled: true,
            notification_attribution: {
              minutes_since_displayed: 60,
              limit: 5,
            },
          },
          unattributed: {
            enabled: true,
          },
        },
      },
      generated_at: 1511912065,
    };

    return deepmerge(
      (<ServerAppConfig>remoteConfigMockDefaults) as Partial<ServerAppConfig>,
      overrideServerConfig || {},
    );
  }

  static getFakeAppUserConfig(appId: string = APP_ID): AppUserConfig {
    return {
      appId,
      autoRegister: true,
      autoResubscribe: true,
      path: '/fake-page',
      serviceWorkerPath: 'fakeWorkerName.js',
      serviceWorkerParam: { scope: '/fake-page' },
      subdomainName: 'fake-subdomain',
      promptOptions: {
        native: {
          enabled: false,
          autoPrompt: false,
        },
        slidedown: {
          prompts: [
            {
              type: DelayedPromptType.Push,
              autoPrompt: true,
              text: {
                acceptButton: 'Allow',
                cancelButton: 'No Thanks',
                actionMessage:
                  "We'd like to send you notifications for the latest news and updates.",
              },
            },
          ],
        },
        fullscreen: {
          enabled: true,
          actionMessage: 'fullscreen action message',
          acceptButton: 'fullscreenaccept button',
          cancelButton: 'fullscreencancel button',
          title: 'fullscreen notification title',
          message: 'fullscreen notification message',
          caption: 'fullscreen notification caption',
        },
        customlink: {
          enabled: false,
          style: 'link',
          size: 'small',
          color: {
            button: '#000000',
            text: '#ffffff',
          },
          text: {
            subscribe: "Let's do it",
            unsubscribe: "I don't want it anymore",
            explanation: 'Wanna stay in touch?',
          },
          unsubscribeEnabled: true,
        },
      },
      welcomeNotification: {
        disable: false,
        title: 'Welcome notification title',
        message: 'Welcome notification message',
        url: 'https://fake-config.com/welcome',
      },
      notifyButton: {
        enable: true,
        displayPredicate: undefined,
        size: 'medium',
        position: 'bottom-left',
        offset: {
          bottom: '1px',
          left: '1px',
          right: '1px',
        },
        colors: {
          'circle.background': '1',
          'circle.foreground': '1',
          'badge.background': '1',
          'badge.foreground': '1',
          'badge.bordercolor': 'black',
          'pulse.color': '1',
          'dialog.button.background.hovering': '1',
          'dialog.button.background.active': '1',
          'dialog.button.background': '1',
          'dialog.button.foreground': '1',
        },
        text: {
          'tip.state.unsubscribed': '1',
          'tip.state.subscribed': '1',
          'tip.state.blocked': '1',
          'message.prenotify': 'Click to subscribe to notifications',
          'message.action.subscribing': '1',
          'message.action.subscribed': '1',
          'message.action.resubscribed': '1',
          'message.action.unsubscribed': '1',
          'dialog.main.title': '1',
          'dialog.main.button.subscribe': '1',
          'dialog.main.button.unsubscribe': '1',
          'dialog.blocked.title': '1',
          'dialog.blocked.message': '1',
        },
      },
      persistNotification: false,
      webhooks: {
        cors: true,
        'notification.displayed':
          'https://fake-config.com/notification-displayed',
        'notification.clicked': 'https://fake-config.com/notification-clicked',
        'notification.dismissed':
          'https://fake-config.com/notification-dismissed',
      },
      notificationClickHandlerMatch: NotificationClickMatchBehavior.Origin,
      notificationClickHandlerAction: NotificationClickActionBehavior.Focus,
      allowLocalhostAsSecureOrigin: true,
    };
  }

  static getFakeMergedConfig(config: TestEnvironmentConfig): AppConfig {
    const fakeUserConfig = config.userConfig || this.getFakeAppUserConfig();
    const fakeServerConfig = this.getFakeServerAppConfig(
      config.integration || ConfigIntegrationKind.Custom,
      config.overrideServerConfig,
    );
    const configManager = new ConfigManager();
    const fakeMergedConfig = configManager.getMergedConfig(
      fakeUserConfig,
      fakeServerConfig,
    );
    return fakeMergedConfig;
  }
}
