import Environment from '../../shared/helpers/EnvironmentHelper';

export interface ServiceWorkerDebugScope {
  environment: Environment;
  database: any;
  browser: any;
  apiUrl: string;
}
