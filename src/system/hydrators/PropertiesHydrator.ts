import { PropertiesModel } from "../types";
import { Hydrator } from "./Hydrator";

export class PropertiesHydrator extends Hydrator<PropertiesModel> {
  constructor() {
    super();
  }

  hydrate(msg: object): void {
    // TO DO
    this.broadcast(msg);
  }
}