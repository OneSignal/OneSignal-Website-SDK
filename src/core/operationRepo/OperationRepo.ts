import { ModelRepo } from '../modelRepo/ModelRepo';
import { ExecutorStore } from '../executors/ExecutorStore';
import { CoreDelta } from '../models/CoreDeltas';
import { SupportedModel } from '../models/SupportedModels';
import { logMethodCall } from '../../shared/utils/utils';
import { NewRecordsState } from '../../shared/models/NewRecordsState';

export class OperationRepo {
  public executorStore: ExecutorStore;
  public newRecordsState: NewRecordsState;
  private _unsubscribeFromModelRepo: () => void;
  private _deltaQueue: CoreDelta<SupportedModel>[] = [];
  static DELTAS_BATCH_PROCESSING_TIME = 1;

  constructor(
    private modelRepo: ModelRepo,
    newRecordsState: NewRecordsState,
  ) {
    this.newRecordsState = newRecordsState;
    this.executorStore = new ExecutorStore(this.newRecordsState);

    this._unsubscribeFromModelRepo = this.modelRepo.subscribe(
      (delta: CoreDelta<SupportedModel>) => {
        this._processDelta(delta);
      },
    );

    setInterval(() => {
      this._processDeltaQueue();
    }, OperationRepo.DELTAS_BATCH_PROCESSING_TIME * 1_000);
  }

  setModelRepoAndResubscribe(modelRepo: ModelRepo) {
    this.modelRepo = modelRepo;
    this._unsubscribeFromModelRepo();
    this._unsubscribeFromModelRepo = this.modelRepo.subscribe(
      (delta: CoreDelta<SupportedModel>) => {
        this._processDelta(delta);
      },
    );
  }

  // call processDeltaQueue on all executors immediately
  forceDeltaQueueProcessingOnAllExecutors(): void {
    this.executorStore.forceDeltaQueueProcessingOnAllExecutors();
  }

  private _flushDeltas(): void {
    this._deltaQueue = [];
  }

  private _processDelta(delta: CoreDelta<SupportedModel>): void {
    logMethodCall('OperationRepo._processDelta', { delta });
    const deltaCopy = JSON.parse(JSON.stringify(delta));
    this._deltaQueue.push(deltaCopy);
  }

  private _processDeltaQueue(): void {
    logMethodCall('OperationRepo._processDeltaQueue');

    this._deltaQueue.forEach((delta) => {
      const { modelName } = delta.model;
      this.executorStore.store[modelName]?.enqueueDelta(delta);
    });

    // for each executor: processDeltaQueue and flush
    this.forceDeltaQueueProcessingOnAllExecutors();

    this._flushDeltas();
  }
}
