import ModelCache from "./system/modelCache/ModelCache";
import ModelRepo from "./system/modelRepo/ModelRepo";
import OperationCache from "./system/operationCache/OperationCache";
import OperationRepo from "./system/operationRepo/OperationRepo";
import RequestService from "./system/requestService/RequestService";

export default class OneSignal {
  public system: {
    setup(): Promise<void>,
    modelRepo: ModelRepo,
    modelCache: ModelCache,
    operationRepo: OperationRepo,
    operationCache: OperationCache,
    requestService: RequestService
  };
  constructor() {
    this.system = {
      modelRepo: new ModelRepo(this),
      modelCache: new ModelCache(this),
      operationRepo: new OperationRepo(this),
      operationCache: new OperationCache(this),
      requestService: new RequestService(this),
      async setup(): Promise<void> {
        await this.modelRepo.setup();
        this.modelCache.setup();
        this.operationRepo.setup();
        this.operationCache.setup();
        this.requestService.setup();
      },
    };
  }
}
