import bowser from "bowser";
import { EnvironmentInfoHelper } from "../page/helpers/EnvironmentInfoHelper";
import AltOriginManager from "../page/managers/AltOriginManager";
import ConfigManager from "../page/managers/ConfigManager";
import Context from "../page/models/Context";
import { SdkInitError, SdkInitErrorKind } from "../shared/errors/SdkInitError";
import EventHelper from "../shared/helpers/EventHelper";
import InitHelper from "../shared/helpers/InitHelper";
import MainHelper from "../shared/helpers/MainHelper";
import Emitter, { EventHandler } from "../shared/libraries/Emitter";
import Log from "../shared/libraries/Log";
import SdkEnvironment from "../shared/managers/SdkEnvironment";
import { SessionManager } from "../shared/managers/sessionManager/SessionManager";
import { AppConfig, AppUserConfig } from "../shared/models/AppConfig";
import { WindowEnvironmentKind } from "../shared/models/WindowEnvironmentKind";
import Database from "../shared/services/Database";
import OneSignalEvent from "../shared/services/OneSignalEvent";
import OneSignalUtils from "../shared/utils/OneSignalUtils";
import { getConsoleStyle } from "../shared/utils/utils";
import OneSignalBase from "./OneSignalBase";

export default class OneSignalProtected extends OneSignalBase {
  protected _pendingInit: boolean = true;
  protected _initAlreadyCalled: boolean = false;

  constructor() {
    super();
  }

  /**
   * Used to subscribe to OneSignal events such as "subscriptionChange"
   * Fires each time the event occurs
   * @param event - Event name to subscribe to
   * @param listener - Listener to fire when event happens
   * @PublicApi
   */
  protected on(event: string, listener: EventHandler): Emitter {
    return this.emitter.on(event, listener);
  }

  protected async internalInit(appConfig: AppConfig) {
    await InitHelper.polyfillSafariFetch();
    InitHelper.errorIfInitAlreadyCalled();

    if (!appConfig) {
      throw new Error("OneSignal config not initialized!");
    }

    if (bowser.safari && !appConfig.safariWebId) {
      /**
       * Don't throw an error for missing Safari config; many users set up
       * support on Chrome/Firefox and don't intend to support Safari but don't
       * place conditional initialization checks.
       */
      Log.warn(new SdkInitError(SdkInitErrorKind.MissingSafariWebId));
      return;
    }

    if (appConfig.userConfig.requiresUserPrivacyConsent) {
      const providedConsent = await Database.getProvideUserConsent();
      if (!providedConsent) {
        this._pendingInit = true;
        return;
      }
    }

    await this.delayedInit(appConfig);
  }

  protected async delayedInit(appConfig: AppConfig) {
    this._pendingInit = false;
    this.context?.workerMessenger.listen();

    const _init = async () => {
      if (this._initAlreadyCalled)
        return;

      this._initAlreadyCalled = true;

      this.emitter.on(this.EVENTS.NATIVE_PROMPT_PERMISSIONCHANGED,
        EventHelper.onNotificationPermissionChange);
      this.emitter.on(this.EVENTS.SUBSCRIPTION_CHANGED, EventHelper._onSubscriptionChanged);
      this.emitter.on(this.EVENTS.SDK_INITIALIZED, InitHelper.onSdkInitialized);

      if (OneSignalUtils.isUsingSubscriptionWorkaround()) {
        /**
         * The user may have forgot to choose a subdomain in his web app setup.
         *
         * Or, the user may have an HTTP & HTTPS site while using an HTTPS-only
         * config on both variants. This would cause the HTTPS site to work
         * perfectly, while causing errors and preventing web push from working
         * on the HTTP site.
         */
        if (!appConfig || !appConfig.subdomain)
          throw new SdkInitError(SdkInitErrorKind.MissingSubdomain);

        /**
         * We'll need to set up page activity tracking events on the main page but we can do so
         * only after the main initialization in the iframe is successful and a new session
         * is initiated.
         */
        this.emitter.on(
          this.EVENTS.SESSION_STARTED, SessionManager.setupSessionEventListenersForHttp
        );

        /**
         * The iFrame may never load (e.g. OneSignal might be down), in which
         * case the rest of the SDK's initialization will be blocked. This is a
         * good thing! We don't want to access IndexedDb before we know which
         * origin to store data on.
         */
        this.proxyFrameHost = await AltOriginManager.discoverAltOrigin(appConfig);
      }

      window.addEventListener('focus', async () => {
        // Checks if permission changed every time a user focuses on the page,
        //     since a user has to click out of and back on the page to check permissions
        await MainHelper.checkAndTriggerNotificationPermissionChanged();
      });

      await InitHelper.initSaveState();
      await InitHelper.saveInitOptions();
      if (SdkEnvironment.getWindowEnv() === WindowEnvironmentKind.CustomIframe)
        await OneSignalEvent.trigger(this.EVENTS.SDK_INITIALIZED);
      else
        await InitHelper.internalInit();
    };

    if (document.readyState === 'complete' || document.readyState === 'interactive')
      await _init();
    else {
      Log.debug('OneSignal: Waiting for DOMContentLoaded or readyStateChange event before continuing' +
        ' initialization...');
      window.addEventListener('DOMContentLoaded', async () => { await _init(); });
      document.onreadystatechange = async () => {
        if (document.readyState === 'complete' || document.readyState === 'interactive')
          await _init();
      };
    }
  }

  async initializeConfig(options: AppUserConfig): Promise<AppConfig> {
    const appConfig = await new ConfigManager().getAppConfig(options);
    Log.debug(`OneSignal: Final web app config: %c${JSON.stringify(appConfig, null, 4)}`, getConsoleStyle('code'));
    return appConfig;
  }
}
