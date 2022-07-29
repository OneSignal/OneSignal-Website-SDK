// import Database from "../../shared/services/Database";
import { Delta, Model } from "../types";

export default class ModelCache {
  constructor() {}

  async save(model: Model, property: string, value: object): Promise<void> {
    console.log("saving in database");
  }

  async get<T>(model: Model): Promise<T> {
    return {
      foo: 'bar'
    } as unknown as T;
  }
}