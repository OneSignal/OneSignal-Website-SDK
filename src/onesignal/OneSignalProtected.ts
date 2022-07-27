import bowser from "bowser";
import OneSignal from "ServiceWorker";
import { EnvironmentInfoHelper } from "../page/helpers/EnvironmentInfoHelper";
import AltOriginManager from "../page/managers/AltOriginManager";
import ConfigManager from "../page/managers/ConfigManager";
import Context from "../page/models/Context";
import { SdkInitError, SdkInitErrorKind } from "../shared/errors/SdkInitError";
import EventHelper from "../shared/helpers/EventHelper";
import InitHelper from "../shared/helpers/InitHelper";
import MainHelper from "../shared/helpers/MainHelper";
import Log from "../shared/libraries/Log";
import SdkEnvironment from "../shared/managers/SdkEnvironment";
import { SessionManager } from "../shared/managers/sessionManager/SessionManager";
import { AppConfig, AppUserConfig } from "../shared/models/AppConfig";
import { WindowEnvironmentKind } from "../shared/models/WindowEnvironmentKind";
import Database from "../shared/services/Database";
import OneSignalUtils from "../shared/utils/OneSignalUtils";
import { getConsoleStyle } from "../shared/utils/utils";
import OneSignalBase from "./OneSignalBase";

export default class OneSignalProtected extends OneSignalBase {
  private pendingInit: boolean = true;

  constructor() {
    super();
  }

  protected async internalInit(options: AppUserConfig) {
    await InitHelper.polyfillSafariFetch();
    InitHelper.errorIfInitAlreadyCalled();
    await this.initializeConfig(options);

    if (!this.config) {
      throw new Error("OneSignal config not initialized!");
    }

    if (bowser.safari && !this.config.safariWebId) {
      /**
       * Don't throw an error for missing Safari config; many users set up
       * support on Chrome/Firefox and don't intend to support Safari but don't
       * place conditional initialization checks.
       */
      Log.warn(new SdkInitError(SdkInitErrorKind.MissingSafariWebId));
      return;
    }

    if (this.config.userConfig.requiresUserPrivacyConsent) {
      const providedConsent = await Database.getProvideUserConsent();
      if (!providedConsent) {
        this.pendingInit = true;
        return;
      }
    }

    await this.delayedInit();
  }

  protected async delayedInit() {
    this.pendingInit = false;
    // Ignore Promise as doesn't return until the service worker becomes active.
    this.context.workerMessenger.listen();

    const _init = async () => {
      if (this.__initAlreadyCalled)
        return;

      this.__initAlreadyCalled = true;

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
        if (!this.config || !this.config.subdomain)
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
        this.proxyFrameHost = await AltOriginManager.discoverAltOrigin(this.config);
      }

      window.addEventListener('focus', () => {
        // Checks if permission changed every time a user focuses on the page,
        //     since a user has to click out of and back on the page to check permissions
        MainHelper.checkAndTriggerNotificationPermissionChanged();
      });

      await InitHelper.initSaveState();
      await InitHelper.saveInitOptions();
      if (SdkEnvironment.getWindowEnv() === WindowEnvironmentKind.CustomIframe)
        await Event.trigger(this.EVENTS.SDK_INITIALIZED);
      else
        await InitHelper.internalInit();
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive')
      await _init();
    else {
      Log.debug('OneSignal: Waiting for DOMContentLoaded or readyStateChange event before continuing' +
        ' initialization...');
      window.addEventListener('DOMContentLoaded', () => { _init(); });
      document.onreadystatechange = () => {
        if (document.readyState === 'complete' || document.readyState === 'interactive')
          _init();
      };
    }
  }

  async initializeConfig(options: AppUserConfig) {
    const appConfig = await new ConfigManager().getAppConfig(options);
    Log.debug(`OneSignal: Final web app config: %c${JSON.stringify(appConfig, null, 4)}`, getConsoleStyle('code'));

    // TODO: environmentInfo is explicitly dependent on existence of this.config. Needs refactor.
    // Workaround to temp assign config so that it can be used in context.
    this.config = appConfig;
    this.environmentInfo = EnvironmentInfoHelper.getEnvironmentInfo();

    this.context = new Context(appConfig);
    this.config = this.context.appConfig;
  }
}
