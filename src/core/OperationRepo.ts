import { Delta, DeltaAggregator, Model, Operation } from "./types";
import Subscribable from "./utils/Subscribable";
import { EnhancedSet } from "./utils/EnhancedSet";
import OperationCache from "./cache/OperationCache";
import ModelRepo from "./ModelRepo";

const DELTAS_BATCH_PROCESSING_TIME = 1;
const OPERATIONS_BATCH_PROCESSING_TIME = 5;

export default class OperationRepo extends Subscribable<Operation> {
  public deltaQueue: Delta[] = [];
  private operationQueue: EnhancedSet<Operation> = new EnhancedSet();
  private onlineStatus: boolean = true;

  constructor(private modelRepo: ModelRepo, private operationCache: OperationCache) {
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
          model: key,
          delta: delta,
        };
        this.operationQueue.add(newOperation);
      }
    }
  }

  private async getCachedOperations(): Promise<void> {
    const cachedOps: Operation[] = await this.operationCache.getAll();
    this.operationQueue.unshift(...cachedOps || []);
  }

  private async processOperationQueue(): Promise<void> {
    if (!this.onlineStatus) {
      return;
    }

    await this.getCachedOperations();
    if (!this.operationQueue.size) {
      return;
    }

    while(this.operationQueue.size > 0) {
      const operation = this.operationQueue.shift();
      /*
      const res = RequestService.request(operation);
      this.broadcast(res);
      */
    }
  }

  private initDeltaAggregator(): DeltaAggregator {
    return {
      [Model.Config]: {},
      [Model.Identity]: {},
      [Model.Properties]: {},
      [Model.Session]: {},
      [Model.Subscriptions]: {}
    };
  }

  private sortByTimestamp(): void {
    this.deltaQueue.sort((x, y) => {
      return x.timestamp - y.timestamp;
    });
  }
}
