import { Delta, DeltaAggregator, Model, Operation } from "./types";
import Subscribable from "./utils/Subscribable";
import OperationCache from "./caches/OperationCache";
import ModelRepo from "./ModelRepo";

const DELTAS_BATCH_PROCESSING_TIME = 1;
const OPERATIONS_BATCH_PROCESSING_TIME = 5;

export default class OperationRepo extends Subscribable<Operation> {
  public deltaQueue: Delta[] = [];
  private onlineStatus: boolean = true;

  constructor(private modelRepo: ModelRepo) {
    super();

    setInterval(this.processDeltaQueue.bind(this), DELTAS_BATCH_PROCESSING_TIME * 1_000);
    setInterval(this.processOperationQueue.bind(this), OPERATIONS_BATCH_PROCESSING_TIME * 1_000);

    window.addEventListener('online', () => { this.onlineStatus = true; });
    window.addEventListener('offline', () => { this.onlineStatus = false; });

    this.modelRepo.subscribe((delta: Delta) => {
      this.deltaQueue.push(delta);
    });
  }

  private processDeltaQueue(): void {
    if (!this.deltaQueue.length) {
      return;
    }

    this.sortByTimestamp();
    const deltaAggregator: DeltaAggregator = this.initDeltaAggregator();

    while(this.deltaQueue.length > 0) {
      const { model, property, newValue } = this.deltaQueue.shift() as Delta;
      deltaAggregator[model][property] = newValue;
    }

    this.pushToOperationsQueue(deltaAggregator);
  }

  private pushToOperationsQueue(deltaAggregator: DeltaAggregator): void {
    const modelKeys = Object.keys(deltaAggregator) as Model[];

    for (let i=0; i<modelKeys.length; i++) {
      const key = modelKeys[i];
      const delta = deltaAggregator[key];

      if (Object.keys(delta).length) {
        const newOperation: Operation = {
          operationId: (Math.random() + 1).toString(12).substr(2), // random string
          model: key,
          delta: delta,
        };
        OperationCache.put(newOperation);
      }
    }
  }

  private async processOperationQueue(): Promise<void> {
    if (!this.onlineStatus) {
      return;
    }

    const operations = await OperationCache.getAll();
    if (!operations.length) {
      return;
    }

    while(operations.length > 0) {
      const operation = operations.shift();
      /*
      const res = RequestService.request(operation);
      this.broadcast(res);

      if (res.success) {
        OperationCache.delete(operation.operationId);
      } else {
        // retry logic
      }
      */
    }
  }

  private initDeltaAggregator(): DeltaAggregator {
    return {
      [Model.Config]: {},
      [Model.Identity]: {},
      [Model.Properties]: {},
      [Model.Subscriptions]: {}
    };
  }

  private sortByTimestamp(): void {
    this.deltaQueue.sort((x, y) => {
      return x.timestamp - y.timestamp;
    });
  }
}
