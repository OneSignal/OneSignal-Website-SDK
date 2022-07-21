import { SubscriptionsModel } from "../types";
import { Hydrator } from "./Hydrator";

export class SubscriptionsHydrator extends Hydrator<SubscriptionsModel> {
  constructor() {
    super();
  }

  hydrate(msg: object): void {
    // TO DO
    this.broadcast(msg);
  }
}