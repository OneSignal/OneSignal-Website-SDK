import { OSModelStore } from "../modelRepo/OSModelStore";
import { ModelName } from "./SupportedModels";

export type ModelStoresMap<Model> = {
  // TO DO: try to restrict keys more
  [key in ModelName]: OSModelStore<Model>;
};
