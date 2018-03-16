import * as log from 'loglevel';
import Context from '../models/Context';
import { ResourceType } from "../services/DynamicResourceLoader";
import SdkEnvironment from '../managers/SdkEnvironment';
import { IntegrationKind } from '../models/IntegrationKind';
import OneSignal from '../OneSignal';

export default class CookieSyncer {
  private isFeatureEnabled: boolean;
  private context: Context;

  constructor(context: Context, isFeatureEnabled: boolean) {
    this.context = context;
    this.isFeatureEnabled = isFeatureEnabled;
  }

  get PUBLISHER_ID(): string {
    const defaultId = "os!os";

    try {
      const appId = this.context.appConfig.appId.value;
      const truncatedAppId = appId.replace(/-/g, '').substr(0, 15).toLowerCase();
      return `os!${truncatedAppId}`;
    } catch (e) {
      return defaultId;
    }
  }

  async getFrameOrigin(): Promise<URL> {
    const integration = await SdkEnvironment.getIntegration();
    switch (integration) {
      case IntegrationKind.Secure:
        return new URL(SdkEnvironment.getOneSignalApiUrl().origin);
      default:
        return new URL(`https://${this.context.appConfig.subdomain}.os.tc`);
    }
  }

  async install() {
    if (!this.isFeatureEnabled) {
      log.debug('Cookie sync feature is disabled.');
      return;
    }
    if (window.top !== window) {
      /* Only process for top frames */
      return;
    }

    const frameUrl = await this.getFrameOrigin();
    frameUrl.pathname = "/webPushAnalytics";

    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = frameUrl.href;

    const loadPromise = {
      promise: undefined,
      resolver: undefined,
      rejector: undefined,
    };
    loadPromise.promise = new Promise((resolve, reject) => {
        loadPromise.resolver = resolve;
        loadPromise.rejector = reject;
    });

    document.body.appendChild(iframe);
    iframe.onload = loadPromise.resolver;
    iframe.onerror = loadPromise.rejector;

    return loadPromise.promise;
  }
}
