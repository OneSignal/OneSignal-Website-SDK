import Environment from "../Environment";
import Database from "../services/Database";
import * as swivel from "swivel";


export interface ServiceWorkerDebugScope {
  environment: Environment;
  swivel: swivel;
  database: any;
  browser: any;
  apiUrl: string;
}