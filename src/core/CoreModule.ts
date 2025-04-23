import Log from '../shared/libraries/Log';
import { logMethodCall } from '../shared/utils/utils';
import { IdentityOperationExecutor } from './executors/IdentityOperationExecutor';
import { ModelRepo } from './modelRepo/ModelRepo';
import { OperationModelStore } from './modelRepo/OperationModelStore';
import { IdentityModelStore } from './modelStores/IdentityModelStore';
import { NewRecordsState } from './operationRepo/NewRecordsState';
import { OperationRepo } from './operationRepo/OperationRepo';

export default class CoreModule {
  public operationModelStore: OperationModelStore;
  public modelRepo?: ModelRepo;
  public operationRepo?: OperationRepo;
  public initPromise: Promise<void>;
  public newRecordsState?: NewRecordsState;

  private initResolver: () => void = () => null;
  private identityModelStore: IdentityModelStore;

  constructor() {
    this.initPromise = new Promise<void>((resolve) => {
      this.initResolver = resolve;
    });

    this.operationModelStore = new OperationModelStore();
    this.identityModelStore = new IdentityModelStore();
    this.operationModelStore
      .loadOperations()
      .then(() => {
        this.newRecordsState = new NewRecordsState();
        this.operationRepo = new OperationRepo(
          [],
          this.operationModelStore,
          this.newRecordsState,
        );
        this.initResolver();
      })
      .catch((e) => {
        Log.error(e);
      });
  }

  private getAllExecutors() {
    return [
      new IdentityOperationExecutor(
        this.identityModelStore,
        this.newRecordsState,
      ),
    ];
  }

  public async init() {
    logMethodCall('CoreModule.init');
    await this.initPromise;
  }
}
