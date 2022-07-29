import { AppConfig } from "../shared/models/AppConfig";
import ModelCache from "./cache/ModelCache";
import OperationCache from "./cache/OperationCache";
import { HydratorBus } from "./HydratorBus";
import ModelRepo from "./ModelRepo";
import OperationRepo from "./OperationRepo";

/**
 * @class CoreModule
 * Initializes core module class instances.
 */

export class CoreModule {
  private modelRepo: ModelRepo;
  private operationRepo: OperationRepo;
  private modelCache: ModelCache;
  private operationCache: OperationCache;

  constructor() {
    this.modelCache = new ModelCache();
    this.modelRepo = new ModelRepo(this.modelCache);
    this.operationCache = new OperationCache();
    this.operationRepo = new OperationRepo(this.modelRepo, this.operationCache);
    new HydratorBus(this.modelRepo, this.operationRepo);
  }

  public async setup(): Promise<void> {
    await this.modelRepo.setup();
  }

  public async getCachedConfig(): Promise<AppConfig> {
    return await this.modelRepo.getCachedConfig();
  }
}
