import { Uuid } from "./Uuid";
import { ServiceWorkerConfig } from "./ServiceWorkerConfig";


export class AppConfig {
    appId: Uuid;
    subdomain: string;
    autoRegister?: boolean;
    serviceWorkerConfig?: ServiceWorkerConfig;
    /**
     * Describes whether the subdomain HTTP users subscribe to should belong to
     * the legacy domain onesignal.com, or the newer domain os.tc.
     */
    httpUseOneSignalCom?: boolean;
    cookieSyncEnabled?: boolean;
    safariWebId?: string;
}

export interface ServerAppConfig {
  success: boolean,
  app_id: string,
  features: {
    cookie_sync: {
      enable: boolean
    }
  },
  config: {
    vapid_public_key: string,
    http_use_onesignal_com: boolean,
    safari_web_id: string,
    subdomain: string
  },
  generated_at: number
}
