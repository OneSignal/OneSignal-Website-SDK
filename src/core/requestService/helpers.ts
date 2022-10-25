import OneSignalError from "src/shared/errors/OneSignalError";
import { IdentityModel } from "../models/IdentityModel";
import { SubscriptionModel } from "../models/SubscriptionModels";
import { Operation } from "../operationRepo/Operation";
import { isIdentityModel, isSubscriptionModel } from "../utils/typePredicates";
import AliasPair from "./AliasPair";

export function processSubscriptionOperation<Model>(operation: Operation<Model>): {
  subscription: SubscriptionModel;
  subscriptionId: string;
  aliasPair: AliasPair;
} {
  const subscription = operation.model?.data;
  const subscriptionModel = operation.model;

  if (!isSubscriptionModel(subscription)) {
    throw new OneSignalError(`processSubscriptionModel: bad subscription object: ${subscription}`);
  }

  const { id } = subscription;

  if (!subscriptionModel) {
    throw new OneSignalError(`processSubscriptionModel: bad subscription OSModel<SubscriptionModel>: ${subscriptionModel}`);
  }

  if (!subscriptionModel.onesignalId) {
    throw new OneSignalError(`processSubscriptionModel: missing onesignalId: ${subscriptionModel}`);
  }

  return {
    subscription,
    subscriptionId: id,
    aliasPair: new AliasPair("onesignalId", subscriptionModel.onesignalId)
  };
}

export function processIdentityOperation<Model>(operation: Operation<Model>): {
  identity: IdentityModel;
  aliasPair: AliasPair;
} {
  const identity = operation.model?.data;

  if (!isIdentityModel(identity)) {
    throw new OneSignalError(`processIdentityModel: bad identity object: ${identity}`);
  }

  const { onesignalId } = identity;

  if (!onesignalId) {
    throw new OneSignalError(`processIdentityModel: missing onesignalId: ${identity}`);
  }

  return {
    identity,
    aliasPair: new AliasPair("onesignalId", onesignalId)
  };
}

