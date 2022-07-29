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
  public modelRepo: ModelRepo;
  public operationRepo: OperationRepo;

  private modelCache: ModelCache;
  private operationCache: OperationCache;

  /* singleton pattern */
  private static instance: CoreModule;
  public static getInstance(): CoreModule {
    if (!CoreModule.instance) {
      CoreModule.instance = new CoreModule();
    }
    return CoreModule.instance;
  }

  protected constructor() {
    this.modelCache = new ModelCache();
    this.modelRepo = new ModelRepo(this.modelCache);
    this.operationCache = new OperationCache();
    this.operationRepo = new OperationRepo(this.modelRepo, this.operationCache);
    new HydratorBus(this.modelRepo, this.operationRepo);
  }

  public async initialize(): Promise<void> {
    await this.modelRepo.initialize();
  }
}
