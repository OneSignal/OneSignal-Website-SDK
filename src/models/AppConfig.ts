import { Uuid } from "./Uuid";


class AppConfig {
    appId: Uuid;
    subdomain: string;
    autoRegister: boolean;
    serviceWorkerScope: string;
    promptOptions: Map<string, any>
}

export { AppConfig };