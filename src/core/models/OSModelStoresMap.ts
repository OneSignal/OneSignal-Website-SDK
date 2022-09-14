import { OSModelStore } from "../modelRepo/OSModelStore";
import { ModelName } from "./SupportedModels";

export type OSModelStoresMap<Model> = {
  // TO DO: try to restrict keys more
  [key in ModelName]: OSModelStore<Model>;
};
