import { ModelRepo } from "../modelRepo/ModelRepo";
import { ExecutorStore } from "../executors/ExecutorStore";
import { CoreDelta } from "../models/CoreDeltas";
import { SupportedModel } from "../models/SupportedModels";
import { logMethodCall } from "../../shared/utils/utils";

export class OperationRepo {
  public executorStore: ExecutorStore;
  private _unsubscribeFromModelRepo: () => void;

  constructor(private modelRepo: ModelRepo) {
    this.executorStore = new ExecutorStore();

    this._unsubscribeFromModelRepo = this.modelRepo.subscribe((delta: CoreDelta<SupportedModel>) => {
      this._processDelta(delta);
    });
  }

  setModelRepoAndResubscribe(modelRepo: ModelRepo) {
    this.modelRepo = modelRepo;
    this._unsubscribeFromModelRepo();
    this._unsubscribeFromModelRepo = this.modelRepo.subscribe((delta: CoreDelta<SupportedModel>) => {
      this._processDelta(delta);
    });
  }

  // call processDeltaQueue on all executors immediately
  forceDeltaQueueProcessingOnAllExecutors(): void {
    this.executorStore.forceDeltaQueueProcessingOnAllExecutors();
  }

  private _processDelta(delta: CoreDelta<SupportedModel>): void {
    logMethodCall("processDelta", { delta });
    const { modelName } = delta.model;
    this.executorStore.store[modelName]?.enqueueDelta(delta);
  }
}
