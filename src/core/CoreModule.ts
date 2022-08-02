import ModelCache from "./caches/ModelCache";
import OperationCache from "./caches/OperationCache";
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

  constructor() {
    this.modelRepo = new ModelRepo();
    this.operationRepo = new OperationRepo(this.modelRepo);
    new HydratorBus(this.modelRepo, this.operationRepo);
  }

  public async initialize(): Promise<void> {
    await this.modelRepo.initialize();
  }
}
