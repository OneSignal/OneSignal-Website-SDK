import { logMethodCall } from 'src/shared/utils/utils';
import { CustomEventController } from './controllers/CustomEventController';
import { CustomEventsOperationExecutor } from './executors/CustomEventOperationExecutor';
import { IdentityOperationExecutor } from './executors/IdentityOperationExecutor';
import { LoginUserOperationExecutor } from './executors/LoginUserOperationExecutor';
import { RefreshUserOperationExecutor } from './executors/RefreshUserOperationExecutor';
import { SubscriptionOperationExecutor } from './executors/SubscriptionOperationExecutor';
import { UpdateUserOperationExecutor } from './executors/UpdateUserOperationExecutor';
import { IdentityModelStoreListener } from './listeners/IdentityModelStoreListener';
import { PropertiesModelStoreListener } from './listeners/PropertiesModelStoreListener';
import { SubscriptionModelStoreListener } from './listeners/SubscriptionModelStoreListener';
import { OperationModelStore } from './modelRepo/OperationModelStore';
import { RebuildUserService } from './modelRepo/RebuildUserService';
import { IdentityModelStore } from './modelStores/IdentityModelStore';
import { PropertiesModelStore } from './modelStores/PropertiesModelStore';
import { SubscriptionModelStore } from './modelStores/SubscriptionModelStore';
import { NewRecordsState } from './operationRepo/NewRecordsState';
import { OperationRepo } from './operationRepo/OperationRepo';
import type { IOperationExecutor } from './types/operation';

export default class CoreModule {
  public _operationModelStore: OperationModelStore;
  public _operationRepo: OperationRepo;
  public _newRecordsState: NewRecordsState;
  public _subscriptionModelStore: SubscriptionModelStore;
  public _identityModelStore: IdentityModelStore;
  public _propertiesModelStore: PropertiesModelStore;
  public _customEventController: CustomEventController;

  private _initPromise: Promise<void>;

  private _rebuildUserService: RebuildUserService;
  private _executors?: IOperationExecutor[];

  constructor() {
    this._newRecordsState = new NewRecordsState();
    this._operationModelStore = new OperationModelStore();
    this._identityModelStore = new IdentityModelStore();
    this._propertiesModelStore = new PropertiesModelStore();
    this._subscriptionModelStore = new SubscriptionModelStore();
    this._rebuildUserService = new RebuildUserService(
      this._identityModelStore,
      this._propertiesModelStore,
      this._subscriptionModelStore,
    );

    this._executors = this._initializeExecutors();
    this._operationRepo = new OperationRepo(
      this._executors,
      this._operationModelStore,
      this._newRecordsState,
    );
    this._customEventController = new CustomEventController(
      this._identityModelStore,
      this._operationRepo,
    );

    this._initializeListeners();
    this._initPromise = this._operationRepo._start();
  }

  public async _init() {
    logMethodCall('CoreModule.init');
    return this._initPromise;
  }

  private _initializeListeners() {
    if (!this._operationRepo) return [];
    return [
      new IdentityModelStoreListener(
        this._identityModelStore,
        this._operationRepo,
      ),
      new PropertiesModelStoreListener(
        this._propertiesModelStore,
        this._operationRepo,
      ),
      new SubscriptionModelStoreListener(
        this._subscriptionModelStore,
        this._operationRepo,
        this._identityModelStore,
      ),
    ];
  }

  private _initializeExecutors() {
    const identityOpExecutor = new IdentityOperationExecutor(
      this._identityModelStore,
      this._rebuildUserService,
      this._newRecordsState,
    );
    const loginOpExecutor = new LoginUserOperationExecutor(
      identityOpExecutor,
      this._identityModelStore,
      this._propertiesModelStore,
      this._subscriptionModelStore,
    );
    const refreshOpExecutor = new RefreshUserOperationExecutor(
      this._identityModelStore,
      this._propertiesModelStore,
      this._subscriptionModelStore,
      this._rebuildUserService,
      this._newRecordsState,
    );
    const subscriptionOpExecutor = new SubscriptionOperationExecutor(
      this._subscriptionModelStore,
      this._rebuildUserService,
      this._newRecordsState,
    );
    const updateSubOpExecutor = new UpdateUserOperationExecutor(
      this._identityModelStore,
      this._propertiesModelStore,
      this._rebuildUserService,
      this._newRecordsState,
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
