import { OSModel } from '../modelRepo/OSModel';
import { OSModelUpdatedArgs } from '../modelRepo/OSModelUpdatedArgs';
import { CoreDelta, ModelDelta, PropertyDelta } from '../models/CoreDeltas';
import { IdentityModel } from '../models/IdentityModel';
import { ModelStoreHydrated } from '../models/ModelStoreChange';
import {
  FutureSubscriptionModel,
  SubscriptionModel,
} from '../models/SubscriptionModels';

export function isPropertyDelta<Model>(
  delta: CoreDelta<Model>,
): delta is PropertyDelta<Model> {
  return (delta as PropertyDelta<Model>).property !== undefined;
}

export function isModelDelta<Model>(
  delta: CoreDelta<Model>,
): delta is ModelDelta<Model> {
  return (
    (delta as ModelDelta<Model>).model !== undefined &&
    (delta as PropertyDelta<Model>).property === undefined
  );
}

export function isPureObject(obj: unknown): obj is Record<string, unknown> {
  return obj !== null && typeof obj === 'object' && obj?.constructor === Object;
}

export function isOSModel<Model>(obj: unknown): obj is OSModel<Model> {
  return (
    obj !== null && typeof obj === 'object' && obj?.constructor === OSModel
  );
}

export function isOSModelUpdatedArgs<Model>(
  obj: unknown,
): obj is OSModelUpdatedArgs<Model> {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    obj?.constructor === OSModelUpdatedArgs
  );
}

export function isModelStoreHydratedObject<Model>(
  obj: unknown,
): obj is ModelStoreHydrated<Model> {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    obj?.constructor === ModelStoreHydrated
  );
}

export function isIdentityObject(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  obj?: any,
): obj is IdentityModel {
  return obj?.onesignal_id !== undefined;
}

export function isFutureSubscriptionObject(obj: {
  type?: string;
}): obj is FutureSubscriptionModel {
  return obj?.type !== undefined;
}

export function isCompleteSubscriptionObject(obj?: {
  type?: string;
  id?: string;
}): obj is SubscriptionModel {
  return obj?.type !== undefined && obj?.id !== undefined;
}
