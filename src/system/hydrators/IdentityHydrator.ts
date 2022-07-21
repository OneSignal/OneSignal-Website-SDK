import { IdentityModel } from "../types";
import { Hydrator } from "./Hydrator";

export class IdentityHydrator extends Hydrator<IdentityModel> {
  constructor() {
    super();
  }

  hydrate(msg: object): void {
    // TO DO
    this.broadcast(msg);
  }
}