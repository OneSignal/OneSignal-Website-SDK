import { ModelName } from "../models/SupportedModels";

/**
 * IndexedDB expects a flattened object with a designated property to index the object
 * We use id to index the object in the database
 */
export default interface EncodedModel {
  modelId: string;
  modelName: ModelName;
  [key: string]: unknown;
}
