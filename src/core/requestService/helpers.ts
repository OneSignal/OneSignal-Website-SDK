import OneSignalError from "../../shared/errors/OneSignalError";
import { IdentityModel } from "../models/IdentityModel";
import { SupportedSubscription } from "../models/SubscriptionModels";
import { Operation } from "../operationRepo/Operation";
import { isIdentityObject, isFutureSubscriptionObject, isCompleteSubscriptionObject } from "../utils/typePredicates";
import AliasPair from "./AliasPair";
import { APIHeaders } from "../../shared/models/APIHeaders";
import ExecutorResult from "../executors/ExecutorResult";
import { UserJwtExpiredEvent } from "../../page/models/UserJwtExpiredEvent";
import AliasType from "./AliasType";

export function processSubscriptionOperation<Model>(operation: Operation<Model>): {
  subscription: SupportedSubscription;
  aliasPair: AliasPair;
  subscriptionId?: string;
  payload?: Partial<SupportedSubscription>
} {
  const subscriptionOSModel = operation.model;
  const subscription = subscriptionOSModel?.data;

  // fixes typescript errors
  if (!subscriptionOSModel) {
    throw new OneSignalError(`processSubscriptionModel: bad subscription OSModel<SubscriptionModel>: ${JSON.stringify(subscriptionOSModel)}`);
  }

  // fixes typescript errors
  if (!isFutureSubscriptionObject(subscription)) {
    throw new OneSignalError(`processSubscriptionModel: bad subscription object: ${JSON.stringify(subscription)}`);
  }

  // fixes typescript errors
  if (!subscriptionOSModel.onesignalId) {
    throw new OneSignalError(`processSubscriptionModel: missing onesignalId: ${JSON.stringify(subscriptionOSModel)}`);
  }

  let subscriptionId;
  if (isCompleteSubscriptionObject(subscription)) {
    subscriptionId = subscription?.id;
  }

  return {
    subscription,
    aliasPair: new AliasPair(AliasType.OneSignalId, subscriptionOSModel.onesignalId),
    subscriptionId,
    payload: operation.payload as Partial<SupportedSubscription>
  };
}

export function processIdentityOperation<Model>(operation: Operation<Model>): {
  identity: IdentityModel;
  aliasPair: AliasPair;
} {
  const identity = operation.model?.data;

  // fixes typescript errors
  if (!isIdentityObject(identity)) {
    throw new OneSignalError(`processIdentityModel: no onesignal_id: ${JSON.stringify(identity)}`);
  }

  const { onesignal_id: onesignalId } = identity;
  // delete onesignal_id from identity object, backend expects it to be in the URI only
  const identityCopy = JSON.parse(JSON.stringify(identity));
  delete identityCopy['onesignal_id'];

  return {
    identity: identityCopy,
    aliasPair: new AliasPair(AliasType.OneSignalId, onesignalId)
  };
}

export function getJWTHeader(jwtToken: string): APIHeaders {
  return { Authorization: `Bearer ${jwtToken}` };
}

export function jwtExpired<Model>(jwtToken?: string | null): ExecutorResult<Model> {
  const externalId = getExternalIdFromJwt(jwtToken);

  if (!externalId) {
    throw new OneSignalError("Could not get external id from expired JWT");
  }

  const event: UserJwtExpiredEvent = {
    externalId
  }

  OneSignal.emitter.emit(OneSignal.EVENTS.JWT_EXPIRED, event);

  return new ExecutorResult(false, false);
}

export function getExternalIdFromJwt(jwtToken?: string | null): string | undefined {
  if (!jwtToken) {
    return undefined;
  }

  const payload = jwtToken.split('.')[1];
  const decodedPayload = base64Decode(payload);
  const parsedPayload = JSON.parse(decodedPayload);
  return parsedPayload.external_id;
}

function base64Decode(base64: string): string {
  const binaryString = atob(base64.replace('-', '+').replace('_', '/'));
  const bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}
