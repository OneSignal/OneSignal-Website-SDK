import ModelCache from './caching/ModelCache';
import { ModelRepo } from './modelRepo/ModelRepo';
import { OperationRepo } from './operationRepo/OperationRepo';
import { OSModelStoreFactory } from './modelRepo/OSModelStoreFactory';
import Log from '../shared/libraries/Log';
import { logMethodCall } from '../shared/utils/utils';
import { SupportedModel } from './models/SupportedModels';
import { NewRecordsState } from '../shared/models/NewRecordsState';

export default class CoreModule {
  public modelRepo?: ModelRepo;
  public operationRepo?: OperationRepo;
  public initPromise: Promise<void>;
  public newRecordsState?: NewRecordsState;

  private modelCache: ModelCache;
  private initResolver: () => void = () => null;

  constructor() {
    this.initPromise = new Promise<void>((resolve) => {
      this.initResolver = resolve;
    });

    this.modelCache = new ModelCache();
    this.modelCache
      .load(ModelRepo.supportedModels)
      .then((allCachedOSModels) => {
        const modelStores = OSModelStoreFactory.build(allCachedOSModels);
        this.modelRepo = new ModelRepo(this.modelCache, modelStores);
        this.newRecordsState = new NewRecordsState();
        this.operationRepo = new OperationRepo(
          this.modelRepo,
          this.newRecordsState,
        );
        this.initResolver();
      })
      .catch((e) => {
        Log.error(e);
      });
  }

  public async init() {
    logMethodCall('CoreModule.init');
    await this.initPromise;
  }

  public async resetModelRepoAndCache() {
    logMethodCall('CoreModule.resetModelRepo');
    await this.modelCache.reset();
    const modelStores = OSModelStoreFactory.build<SupportedModel>();
    this.modelRepo = new ModelRepo(this.modelCache, modelStores);
    this.operationRepo?.setModelRepoAndResubscribe(this.modelRepo);
  }

  // call processDeltaQueue on all executors immediately
  public forceDeltaQueueProcessingOnAllExecutors(): void {
    this.operationRepo?.forceDeltaQueueProcessingOnAllExecutors();
  }
}
