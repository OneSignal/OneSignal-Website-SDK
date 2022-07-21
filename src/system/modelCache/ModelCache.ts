// import Database from "../../shared/services/Database";
import OneSignal from "../../OneSignal";
import { Delta, Model } from "../types";

export default class ModelCache {
  constructor(private oneSignal: OneSignal) {}

  public setup(): void {
    this.oneSignal.system.modelRepo.subscribe(this.handleModelChange);
  }

  private handleModelChange(delta: Delta): void {
    // const { model, property, newValue } = delta;
    // TO DO: update database
  }

  async save(model: Model, property: string, value: object): Promise<void> {
    console.log("saving in database");
  }

  async get(model: Model): Promise<object> {
    return {
      foo: 'bar'
    };
  }
}