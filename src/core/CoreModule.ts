import OneSignalError from "../shared/errors/OneSignalError";
import ModelCache from "./caches/ModelCache";
import { HydratorBus } from "./HydratorBus";
import ModelRepo from "./ModelRepo";
import OperationRepo from "./OperationRepo";

/**
 * @class CoreModule
 * Initializes core module class instances.
 */

export class CoreModule {
  public modelCache: ModelCache;
  public modelRepo?: ModelRepo;
  public operationRepo?: OperationRepo;

  constructor() {
    this.modelCache = new ModelCache();
    this.modelCache.load().then(() => {
      this.modelRepo = new ModelRepo(this.modelCache);
      this.operationRepo = new OperationRepo(this.modelRepo);
      new HydratorBus(this.modelRepo, this.operationRepo);

      // TO DO: resolve a promise we can await on to block initialization.
    }).catch(e => {
      throw new OneSignalError(`Could not load CoreModule: ${e}`);
    });
  }
}
