import { ConfigModel } from "../types";
import { Hydrator } from "./Hydrator";

export class ConfigHydrator extends Hydrator<ConfigModel> {
  constructor() {
    super();
  }

  hydrate(msg: object): void {
    // TO DO
    this.broadcast(msg);
  }
}