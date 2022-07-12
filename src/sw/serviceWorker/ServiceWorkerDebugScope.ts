import Environment from "../../shared/helpers/Environment";

export interface ServiceWorkerDebugScope {
  environment: Environment;
  database: any;
  browser: any;
  apiUrl: string;
}
