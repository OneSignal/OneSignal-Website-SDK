import { ModelRepo } from "../modelRepo/ModelRepo";
import { OSExecutorStore } from "../executors/OSExecutorStore";
import { CoreDelta } from "../models/CoreDeltas";
import { SupportedModel } from "../models/SupportedModels";

export class OperationRepo {
  public executorStore: OSExecutorStore;

  constructor(private modelRepo: ModelRepo) {
    this.executorStore = new OSExecutorStore();

    this.modelRepo.subscribe((delta: CoreDelta<SupportedModel>) => {
      this.processDelta(delta);
    });
  }

  private processDelta(delta: CoreDelta<SupportedModel>): void {
    const { modelName } = delta.model;
    this.executorStore[modelName]?.enqueueDelta(delta);
  }
}
