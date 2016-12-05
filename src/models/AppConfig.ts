import { Uuid } from "./Uuid";
import { ServiceWorkerConfig } from "./ServiceWorkerConfig";


class AppConfig {
    appId: Uuid;
    subdomain: string;
    autoRegister: boolean;
    serviceWorkerConfig: ServiceWorkerConfig;
}

export { AppConfig };