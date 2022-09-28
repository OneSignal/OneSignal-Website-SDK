import { OSModel } from "../modelRepo/OSModel";
import { OSModelUpdatedArgs } from "../modelRepo/OSModelUpdatedArgs";
import { CoreChangeType } from "./CoreChangeType";

export interface ModelStoreChange<Model> {
  type: CoreChangeType;
  id: string;
  noRemoteSync: boolean;
  payload: OSModel<Model> | OSModelUpdatedArgs<Model>;
}

export class ModelStoreAdded<Model> implements ModelStoreChange<Model> {
  type: CoreChangeType.Add = CoreChangeType.Add;
  constructor(public id: string, public payload: OSModel<Model>, public noRemoteSync: boolean = false) {}
}

export class ModelStoreRemoved<Model> implements ModelStoreChange<Model> {
  type: CoreChangeType.Remove = CoreChangeType.Remove;
  constructor(public id: string, public payload: OSModel<Model>, public noRemoteSync: boolean = false) {}
}

export class ModelStoreUpdated<Model> implements ModelStoreChange<Model> {
  type: CoreChangeType.Update = CoreChangeType.Update;
  constructor(public id: string, public payload: OSModelUpdatedArgs<Model>, public noRemoteSync: boolean = false) {}
}
