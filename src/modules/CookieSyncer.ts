import * as log from 'loglevel';
import Context from '../models/Context';
import { ResourceType } from "../services/DynamicResourceLoader";

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
      const truncatedAppId = appId.replace(/-/g, '').substr(0, 15);
      return `os!${truncatedAppId}`;
    } catch (e) {
      return defaultId;
    }
  }

  static get SDK_URL(): URL {
    const url = new URL("https://cdn.tynt.com/afx.js");
    url.protocol = window.location.protocol;
    return url;
  }

  install() {
    if (!this.isFeatureEnabled) {
      log.debug('Cookie sync feature is disabled.');
      return;
    }
    if (window.top !== window) {
      /* This cookie integration can only be injected into the top frame, so that it's targeting the intended site. */
      return;
    }

    (window as any).Tynt = (window as any).Tynt || [];
    (window as any).Tynt.push(this.PUBLISHER_ID);

    this.context.dynamicResourceLoader.loadIfNew(ResourceType.Script, CookieSyncer.SDK_URL);
    log.debug('Enabled cookie sync feature.');
  }
}
