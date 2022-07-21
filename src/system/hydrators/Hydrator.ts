import Subscribable from "../Subscribable";

export abstract class Hydrator<ModelObject> extends Subscribable<ModelObject> {
  constructor() {
    super();
  }

  protected broadcast(msg: ModelObject): void {
    this.subscribers.forEach(subscriber => {
      subscriber(msg);
    });
  }

  abstract hydrate(msg: object): void;
}
