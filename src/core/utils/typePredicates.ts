import { OSModel } from "../modelRepo/OSModel";
import { OSModelUpdatedArgs } from "../modelRepo/OSModelUpdatedArgs";
import { CoreDelta, PropertyDelta, ModelDelta } from "../models/CoreDeltas";

export function isPropertyDelta<Model>(delta: CoreDelta<Model>): delta is PropertyDelta<Model> {
  return (delta as PropertyDelta<Model>).newValue !== undefined &&
    (delta as PropertyDelta<Model>).property !== undefined;
}

export function isModelDelta<Model>(delta: CoreDelta<Model>): delta is ModelDelta<Model> {
  return (delta as ModelDelta<Model>).model !== undefined;
}

export function isPureObject(obj: any): obj is Object {
  return obj !== null && typeof obj === "object" && obj.constructor === Object;
}

export function isOSModel<Model>(obj: any): obj is OSModel<Model> {
  return obj !== null && typeof obj === "object" && obj.constructor === OSModel;
}

export function isOSModelUpdatedArgs<Model>(obj: any): obj is OSModelUpdatedArgs<Model> {
  return obj !== null && typeof obj === "object" && obj.constructor === OSModelUpdatedArgs;
}