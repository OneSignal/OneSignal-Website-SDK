import { OSModel } from '../modelRepo/OSModel';
import EncodedModel from './EncodedModel';
import { StringIndexable } from '../models/StringIndexable';
import { ModelName, OSModelType, SupportedModel } from '../models/SupportedModels';
import Database from '../../shared/services/Database';
import { logMethodCall } from '../../shared/utils/utils';

export default class ModelCache {
  private _mutexPromise: Promise<void> = Promise.resolve();
  private _mutexLocked = false;

  /**
   * Add an entire model to the cache
   * @param modelName
   * @param model
   */
  async add<Model>(modelName: ModelName, model: OSModel<Model>): Promise<void> {
    logMethodCall('ModelCache.add', { modelName, model });
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
    logMethodCall('ModelCache.remove', { modelName, modelId });
    await Database.remove(modelName, modelId);
  }

  /**
   * Update a key-value pair of a model in the cache
   * @param modelName
   * @param modelId
   * @param key
   * @param value
   */
  async update(
    modelName: ModelName,
    modelId: string,
    key: string,
    value: any,
  ): Promise<void> {
    if (this._mutexLocked) {
      await this._mutexPromise;
    }

    this._mutexLocked = true;
    // eslint-disable-next-line no-async-promise-executor
    this._mutexPromise = new Promise(async (resolve, reject) => {
      logMethodCall('ModelCache.update', { modelName, modelId, key, value });
      const model = await this.get(modelName, modelId);

      if (!model) {
        reject('ModelCache: Attempting to update a model that does not exist');
      }
      if (model) {
        model[key] = value;
        await Database.put(modelName, model);
        this._mutexLocked = false;
        resolve();
      }

      setTimeout(reject.bind(this, 'Database promise never resolved.'), 10000);
    });
  }

  /**
   * Loads all models from the cache and returns them as an object
   * @param modelNames
   */
  async load(
    modelNames: ModelName[],
  ): Promise<{ [key: string]: OSModel<SupportedModel>[] }> {
    logMethodCall('ModelCache.load', { modelNames });
    const allCachedOSModels: StringIndexable = {};

    for (let i = 0; i < modelNames.length; i++) {
      const modelName = modelNames[i];
      const cachedOSModels =
        await this.getAndDecodeModelsWithModelName(modelName);

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
  async get(
    modelName: ModelName,
    modelId: string,
  ): Promise<EncodedModel | undefined> {
    logMethodCall('ModelCache.get', { modelName, modelId });
    try {
      await this._mutexPromise;
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
    logMethodCall('ModelCache.getCachedEncodedModels', { modelName });
    return await Database.getAll(modelName);
  }

  /**
   * Decodes & returns all models of a specific model name
   * @param modelName
   */
  async getAndDecodeModelsWithModelName(
    modelName: ModelName,
  ): Promise<OSModelType<SupportedModel>[] | void> {
    logMethodCall('ModelCache.getAndDecodeModelsWithModelName', { modelName });
    const models = await this.getCachedEncodedModels(modelName);

    if (Object.keys(models).length === 0) {
      return;
    }

    return models.map(OSModel.decode);
  }

  async reset(): Promise<void> {
    logMethodCall('ModelCache.reset');
    const removePromises: Promise<unknown>[] = [];
    Object.values(ModelName).forEach(async (modelName: ModelName) => {
      removePromises.push(Database.singletonInstance.remove(modelName));
    });
    await Promise.all(removePromises);
  }
}
