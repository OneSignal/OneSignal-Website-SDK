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
