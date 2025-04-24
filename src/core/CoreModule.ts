import Log from '../shared/libraries/Log';
import { logMethodCall } from '../shared/utils/utils';
import { IdentityOperationExecutor } from './executors/IdentityOperationExecutor';
import { LoginUserFromSubscriptionOperationExecutor } from './executors/LoginUserFromSubscriptionOperationExecutor';
import { LoginUserOperationExecutor } from './executors/LoginUserOperationExecutor';
import { RefreshUserOperationExecutor } from './executors/RefreshUserOperationExecutor';
import { SubscriptionOperationExecutor } from './executors/SubscriptionOperationExecutor';
import { UpdateUserOperationExecutor } from './executors/UpdateUserOperationExecutor';
import { ModelRepo } from './modelRepo/ModelRepo';
import { OperationModelStore } from './modelRepo/OperationModelStore';
import { RebuildUserService } from './modelRepo/RebuildUserService';
import { ConfigModelStore } from './modelStores/ConfigModelStore';
import { IdentityModelStore } from './modelStores/IdentityModelStore';
import { PropertiesModelStore } from './modelStores/PropertiesModelStore';
import { SubscriptionModelStore } from './modelStores/SubscriptionModelStore';
import { NewRecordsState } from './operationRepo/NewRecordsState';
import { OperationRepo } from './operationRepo/OperationRepo';
import { IOperationExecutor } from './types/operation';

export default class CoreModule {
  public operationModelStore: OperationModelStore;
  public modelRepo?: ModelRepo;
  public operationRepo?: OperationRepo;
  public initPromise: Promise<void>;
  public newRecordsState: NewRecordsState;

  private initResolver: () => void = () => null;
  private identityModelStore: IdentityModelStore;
  private propertiesModelStore: PropertiesModelStore;
  private subscriptionModelStore: SubscriptionModelStore;
  private configModelStore: ConfigModelStore;
  private rebuildUserService: RebuildUserService;
  private executors?: IOperationExecutor[];

  constructor() {
    this.initPromise = new Promise<void>((resolve) => {
      this.initResolver = resolve;
    });

    this.newRecordsState = new NewRecordsState();
    this.operationModelStore = new OperationModelStore();
    this.identityModelStore = new IdentityModelStore();
    this.propertiesModelStore = new PropertiesModelStore();
    this.subscriptionModelStore = new SubscriptionModelStore();
    this.configModelStore = new ConfigModelStore();
    this.rebuildUserService = new RebuildUserService(
      this.identityModelStore,
      this.propertiesModelStore,
      this.subscriptionModelStore,
      this.configModelStore,
    );

    this.operationModelStore
      .loadOperations()
      .then(() => {
        this.executors = this.initializeExecutors();
        this.operationRepo = new OperationRepo(
          this.executors,
          this.operationModelStore,
          this.newRecordsState,
        );
        this.initResolver();
      })
      .catch((e) => {
        Log.error(e);
      });
  }

  private initializeExecutors() {
    const identityOpExecutor = new IdentityOperationExecutor(
      this.identityModelStore,
      this.rebuildUserService,
      this.newRecordsState,
    );
    const loginOpExecutor = new LoginUserOperationExecutor(
      identityOpExecutor,
      this.identityModelStore,
      this.propertiesModelStore,
      this.subscriptionModelStore,
      this.configModelStore,
    );
    const loginSubOpExecutor = new LoginUserFromSubscriptionOperationExecutor(
      this.identityModelStore,
      this.propertiesModelStore,
    );
    const refreshOpExecutor = new RefreshUserOperationExecutor(
      this.identityModelStore,
      this.propertiesModelStore,
      this.subscriptionModelStore,
      this.configModelStore,
      this.rebuildUserService,
      this.newRecordsState,
    );
    const subscriptionOpExecutor = new SubscriptionOperationExecutor(
      this.subscriptionModelStore,
      this.configModelStore,
      this.rebuildUserService,
      this.newRecordsState,
    );
    const updateSubOpExecutor = new UpdateUserOperationExecutor(
      this.identityModelStore,
      this.propertiesModelStore,
      this.rebuildUserService,
      this.newRecordsState,
    );

    return [
      identityOpExecutor,
      loginOpExecutor,
      loginSubOpExecutor,
      refreshOpExecutor,
      subscriptionOpExecutor,
      updateSubOpExecutor,
    ];
  }

  public async init() {
    logMethodCall('CoreModule.init');
    await this.initPromise;
  }
}
