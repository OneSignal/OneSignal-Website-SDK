
import { OSModel } from "../modelRepo/OSModel";
import EncodedModel from "./EncodedModel";
import { StringIndexable } from "../models/StringIndexable";
import { ModelName, SupportedModel } from "../models/SupportedModels";
import Database from "../../shared/services/Database";

export default class ModelCache {
  /**
   * Add an entire model to the cache
   * @param modelName
   * @param model
   */
  async add<Model>(modelName: ModelName, model: OSModel<Model>): Promise<void> {
    const encoded = model.encode();
    const modelsObject = { ...encoded };
    await Database.put(modelName, modelsObject);
  }

  /**
   * Remove an entire model by model name and id
   * @param modelName
   * @param modelId
   */
  async remove(modelName: ModelName, modelId: string): Promise<void> {
    await Database.remove(modelName, modelId);
  }

  /**
   * Update a key-value pair of a model in the cache
   * @param modelName
   * @param modelId
   * @param key
   * @param value
   */
  async update(modelName: ModelName, modelId: string, key: string, value: any): Promise<void> {
    const model = await this.get(modelName, modelId);
    if (!model) {
      throw new Error("ModelCache: Attempting to update a model that does not exist");
    }
    if (model) {
      model[key] = value;
      await Database.put(modelName, model);
    }
  }

  /**
   * Loads all models from the cache and returns them as an object
   * @param modelNames
   */
  async load(modelNames: ModelName[]): Promise<{[key: string]: OSModel<SupportedModel>[]}> {
    const allCachedOSModels: StringIndexable = {};

    for (let i=0; i<modelNames.length; i++) {
      const modelName = modelNames[i];
      const cachedOSModels = await this.getAndDecodeModelsWithModelName(modelName);

      if (cachedOSModels) {
        allCachedOSModels[modelName] = cachedOSModels;
      }
    }
    return allCachedOSModels;
  }

  /**
   * Get a specific model by model name and id
   * @param modelName
   * @param modelId
   */
  async get(modelName: ModelName, modelId: string): Promise<EncodedModel | undefined> {
    try {
      return await Database.get(modelName, modelId);
    } catch (e) {
      return undefined;
    }
  }

  /**
   * Get all models of a specific model name
   * @param modelName
   */
  async getCachedEncodedModels(modelName: ModelName): Promise<EncodedModel[]> {
    return await Database.getAll(modelName);
  }

  /**
   * Decodes & returns all models of a specific model name
   * @param modelName
   */
  async getAndDecodeModelsWithModelName(modelName: ModelName): Promise<OSModel<SupportedModel>[] | void> {
    const models = await this.getCachedEncodedModels(modelName);

    if (Object.keys(models).length === 0) {
      return;
    }

    return models.map(OSModel.decode);
  }
}
