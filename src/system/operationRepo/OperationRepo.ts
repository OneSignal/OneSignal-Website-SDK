import { ConfigModel, Delta, IdentityModel, Model, Operation, PropertiesModel, SessionModel, SubscriptionsModel } from "../types";
import OneSignal from "../../OneSignal";
import Subscribable from "../Subscribable";
import { EnhancedSet } from "../EnhancedSet";

const DELTAS_BATCH_PROCESSING_TIME = 1;

type DeltaAggregator = {
  [Model.Config]: ConfigModel,
  [Model.Identity]: IdentityModel,
  [Model.Properties]: PropertiesModel,
  [Model.Session]: SessionModel,
  [Model.Subscriptions]: SubscriptionsModel
};

export default class OperationRepo extends Subscribable<Operation> {
  public deltaQueue: Delta[] = [];
  private operationQueue: EnhancedSet<Operation> = new EnhancedSet();
  constructor(private oneSignal: OneSignal) {
    super();
    setInterval(this.processDeltaQueue.bind(this), DELTAS_BATCH_PROCESSING_TIME * 1_000);
  }

  public setup(): void {
    this.oneSignal.system.modelRepo.subscribe((delta: Delta) => {
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