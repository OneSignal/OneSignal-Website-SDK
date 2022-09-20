import Environment from '../Environment';


export interface ServiceWorkerDebugScope {
  environment: Environment;
  database: any;
  browser: any;
  apiUrl: string;
}
