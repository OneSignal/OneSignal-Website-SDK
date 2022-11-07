import OneSignalError from "../../shared/errors/OneSignalError";
import { IdentityModel } from "../models/IdentityModel";
import { SubscriptionModel } from "../models/SubscriptionModels";
import { Operation } from "../operationRepo/Operation";
import { isIdentityObject, isFutureSubscriptionObject } from "../utils/typePredicates";
import AliasPair from "./AliasPair";

export function processSubscriptionOperation<Model>(operation: Operation<Model>): {
  subscription: SubscriptionModel;
  subscriptionId: string;
  aliasPair: AliasPair;
} {
  const subscriptionOSModel = operation.model;
  const subscription = subscriptionOSModel?.data;

  // fixes typescript errors
  if (!subscriptionOSModel) {
    throw new OneSignalError(`processSubscriptionModel: bad subscription OSModel<SubscriptionModel>: ${subscriptionOSModel}`);
  }

  // fixes typescript errors
  if (!isFutureSubscriptionObject(subscription)) {
    throw new OneSignalError(`processSubscriptionModel: bad subscription object: ${subscription}`);
  }

  const subscriptionId = subscription.id;

  // fixes typescript errors
  if (!subscriptionOSModel.onesignalId) {
    throw new OneSignalError(`processSubscriptionModel: missing onesignalId: ${subscriptionOSModel}`);
  }

  return {
    subscription,
    subscriptionId,
    aliasPair: new AliasPair("onesignalId", subscriptionOSModel.onesignalId)
  };
}

export function processIdentityOperation<Model>(operation: Operation<Model>): {
  identity: IdentityModel;
  aliasPair: AliasPair;
} {
  const identity = operation.model?.data;

  // fixes typescript errors
  if (!isIdentityObject(identity)) {
    throw new OneSignalError(`processIdentityModel: bad identity object: ${identity}`);
  }

  const { onesignalId } = identity;

  // fixes typescript errors
  if (!onesignalId) {
    throw new OneSignalError(`processIdentityModel: missing onesignalId: ${identity}`);
  }

  return {
    identity,
    aliasPair: new AliasPair("onesignalId", onesignalId)
  };
}

