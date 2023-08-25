import Database from '../../shared/services/Database';
import OneSignalError from '../../shared/errors/OneSignalError';
import { IdentityModel } from '../models/IdentityModel';
import { SupportedSubscription } from '../models/SubscriptionModels';
import { Operation } from '../operationRepo/Operation';
import {
  isIdentityObject,
  isFutureSubscriptionObject,
  isCompleteSubscriptionObject,
} from '../utils/typePredicates';
import AliasPair from './AliasPair';
import { APIHeaders } from '../../shared/models/APIHeaders';

export function processSubscriptionOperation<Model>(
  operation: Operation<Model>,
): {
  subscription: SupportedSubscription;
  aliasPair: AliasPair;
  subscriptionId?: string;
  payload?: Partial<SupportedSubscription>;
} {
  const subscriptionOSModel = operation.model;
  const subscription = subscriptionOSModel?.data;

  // fixes typescript errors
  if (!subscriptionOSModel) {
    throw new OneSignalError(
      `processSubscriptionModel: bad subscription OSModel<SubscriptionModel>: ${JSON.stringify(
        subscriptionOSModel,
      )}`,
    );
  }

  // fixes typescript errors
  if (!isFutureSubscriptionObject(subscription)) {
    throw new OneSignalError(
      `processSubscriptionModel: bad subscription object: ${JSON.stringify(
        subscription,
      )}`,
    );
  }

  // fixes typescript errors
  if (!subscriptionOSModel.onesignalId) {
    throw new OneSignalError(
      `processSubscriptionModel: missing onesignalId: ${JSON.stringify(
        subscriptionOSModel,
      )}`,
    );
  }

  let subscriptionId;
  if (isCompleteSubscriptionObject(subscription)) {
    subscriptionId = subscription?.id;
  }

  return {
    subscription,
    aliasPair: new AliasPair(
      AliasPair.ONESIGNAL_ID,
      subscriptionOSModel.onesignalId,
    ),
    subscriptionId,
    payload: operation.payload as Partial<SupportedSubscription>,
  };
}

export function processIdentityOperation<Model>(operation: Operation<Model>): {
  identity: IdentityModel;
  aliasPair: AliasPair;
} {
  const identity = operation.model?.data;

  // fixes typescript errors
  if (!isIdentityObject(identity)) {
    throw new OneSignalError(
      `processIdentityModel: bad identity object: ${JSON.stringify(identity)}`,
    );
  }

  const { onesignal_id: onesignalId } = identity;
  // delete onesignal_id from identity object, backend expects it to be in the URI only
  const identityCopy = JSON.parse(JSON.stringify(identity));
  delete identityCopy['onesignal_id'];

  // fixes typescript errors
  if (!onesignalId) {
    throw new OneSignalError(
      `processIdentityModel: missing onesignalId: ${JSON.stringify(identity)}`,
    );
  }

  return {
    identity: identityCopy,
    aliasPair: new AliasPair(AliasPair.ONESIGNAL_ID, onesignalId),
  };
}

export async function getJWTHeader(): Promise<APIHeaders | undefined> {
  const jwtToken = await Database.getJWTToken();
  return !!jwtToken ? { Authorization: `Bearer ${jwtToken}` } : undefined;
}
