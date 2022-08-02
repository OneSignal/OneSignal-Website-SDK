// import Database from "../../shared/services/Database";
import Database from "../../shared/services/Database";
import { Model } from "../types";

export default class ModelCache {
  static async put(model: Model, property: string, value: object): Promise<void> {
    await Database.put("Models", { key: model, value: { [property]: value } });
  }

  static async get<T>(model: Model): Promise<T> {
    return Database.get("Models", model);
  }
}