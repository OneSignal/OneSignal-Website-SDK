import ModelCache from "./caching/ModelCache";
import { ModelRepo } from "./modelRepo/ModelRepo";
import { OperationRepo } from "./operationRepo/OperationRepo";
import { OSModelStoreFactory } from "./modelRepo/OSModelStoreFactory";
import Log from "../shared/libraries/Log";
import { logMethodCall } from "../shared/utils/utils";
import { SupportedModel } from "./models/SupportedModels";

export default class CoreModule {
  public modelRepo?: ModelRepo;
  public operationRepo?: OperationRepo;
  public initPromise: Promise<void>;

  private modelCache: ModelCache;
  private initResolver: () => void = () => null;

  constructor() {
    this.initPromise = new Promise<void>(resolve => {
      this.initResolver = resolve;
    });

    this.modelCache = new ModelCache();
    this.modelCache
      .load(ModelRepo.supportedModels)
      .then(allCachedOSModels => {
        const modelStores = OSModelStoreFactory.build(allCachedOSModels);
        this.modelRepo = new ModelRepo(this.modelCache, modelStores);
        this.operationRepo = new OperationRepo(this.modelRepo);
        this.initResolver();
      }
    ).catch(e => {
      Log.error(e);
    });
  }

  public async init(){
    logMethodCall("CoreModule.init");
    await this.initPromise;
  }

  public resetModelRepo() {
    logMethodCall("CoreModule.resetModelRepo");
    const modelStores = OSModelStoreFactory.build<SupportedModel>();
    this.modelRepo = new ModelRepo(this.modelCache, modelStores);
  }
}
