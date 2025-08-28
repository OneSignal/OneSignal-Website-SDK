import { logMethodCall } from 'src/shared/utils/utils';
import { CustomEventController } from './controllers/CustomEventController';
import { CustomEventsOperationExecutor } from './executors/CustomEventOperationExecutor';
import { IdentityOperationExecutor } from './executors/IdentityOperationExecutor';
import { LoginUserOperationExecutor } from './executors/LoginUserOperationExecutor';
import { RefreshUserOperationExecutor } from './executors/RefreshUserOperationExecutor';
import { SubscriptionOperationExecutor } from './executors/SubscriptionOperationExecutor';
import { UpdateUserOperationExecutor } from './executors/UpdateUserOperationExecutor';
import { IdentityModelStoreListener } from './listeners/IdentityModelStoreListener';
import { ModelStoreListener } from './listeners/ModelStoreListener';
import { PropertiesModelStoreListener } from './listeners/PropertiesModelStoreListener';
import { type SingletonModelStoreListener } from './listeners/SingletonModelStoreListener';
import { SubscriptionModelStoreListener } from './listeners/SubscriptionModelStoreListener';
import { OperationModelStore } from './modelRepo/OperationModelStore';
import { RebuildUserService } from './modelRepo/RebuildUserService';
import { type Model } from './models/Model';
import { IdentityModelStore } from './modelStores/IdentityModelStore';
import { PropertiesModelStore } from './modelStores/PropertiesModelStore';
import { SubscriptionModelStore } from './modelStores/SubscriptionModelStore';
import { NewRecordsState } from './operationRepo/NewRecordsState';
import { OperationRepo } from './operationRepo/OperationRepo';
import type { IOperationExecutor } from './types/operation';

export default class CoreModule {
  public operationModelStore: OperationModelStore;
  public operationRepo: OperationRepo;
  public newRecordsState: NewRecordsState;
  public subscriptionModelStore: SubscriptionModelStore;
  public identityModelStore: IdentityModelStore;
  public propertiesModelStore: PropertiesModelStore;
  public customEventController: CustomEventController;

  private initPromise: Promise<void>;

  private rebuildUserService: RebuildUserService;
  private executors?: IOperationExecutor[];

  // @ts-expect-error - not exposed but keeps track of listeners
  private listeners?: (
    | SingletonModelStoreListener<Model>
    | ModelStoreListener<Model>
  )[];

  constructor() {
    this.newRecordsState = new NewRecordsState();
    this.operationModelStore = new OperationModelStore();
    this.identityModelStore = new IdentityModelStore();
    this.propertiesModelStore = new PropertiesModelStore();
    this.subscriptionModelStore = new SubscriptionModelStore();
    this.rebuildUserService = new RebuildUserService(
      this.identityModelStore,
      this.propertiesModelStore,
      this.subscriptionModelStore,
    );

    this.executors = this.initializeExecutors();
    this.operationRepo = new OperationRepo(
      this.executors,
      this.operationModelStore,
      this.newRecordsState,
    );
    this.customEventController = new CustomEventController(
      this.identityModelStore,
      this.operationRepo,
    );

    this.listeners = this.initializeListeners();
    this.initPromise = this.operationRepo._start();
  }

  public async init() {
    logMethodCall('CoreModule.init');
    return this.initPromise;
  }

  private initializeListeners() {
    if (!this.operationRepo) return [];
    return [
      new IdentityModelStoreListener(
        this.identityModelStore,
        this.operationRepo,
      ),
      new PropertiesModelStoreListener(
        this.propertiesModelStore,
        this.operationRepo,
      ),
      new SubscriptionModelStoreListener(
        this.subscriptionModelStore,
        this.operationRepo,
        this.identityModelStore,
      ),
    ];
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
    );
    const refreshOpExecutor = new RefreshUserOperationExecutor(
      this.identityModelStore,
      this.propertiesModelStore,
      this.subscriptionModelStore,
      this.rebuildUserService,
      this.newRecordsState,
    );
    const subscriptionOpExecutor = new SubscriptionOperationExecutor(
      this.subscriptionModelStore,
      this.rebuildUserService,
      this.newRecordsState,
    );
    const updateSubOpExecutor = new UpdateUserOperationExecutor(
      this.identityModelStore,
      this.propertiesModelStore,
      this.rebuildUserService,
      this.newRecordsState,
    );
    const customEventOpExecutor = new CustomEventsOperationExecutor();

    return [
      identityOpExecutor,
      loginOpExecutor,
      refreshOpExecutor,
      subscriptionOpExecutor,
      updateSubOpExecutor,
      customEventOpExecutor,
    ];
  }
}
