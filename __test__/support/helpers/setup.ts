import { ONESIGNAL_ID } from '__test__/constants';
import { IdentityModel } from 'src/core/models/IdentityModel';
import { PropertiesModel } from 'src/core/models/PropertiesModel';
import { SubscriptionModel } from 'src/core/models/SubscriptionModel';
import { ModelChangeTags } from 'src/core/types/models';
import { db } from 'src/shared/database/client';
import type {
  IdentitySchema,
  PropertiesSchema,
} from 'src/shared/database/types';

export const setIsPushEnabled = async (isPushEnabled: boolean) => {
  await db.put('Options', { key: 'isPushEnabled', value: isPushEnabled });
};

export const getIdentityItem = async (
  condition: (identity: IdentitySchema) => boolean = () => true,
) => {
  let identity: IdentitySchema | undefined;
  await vi.waitUntil(async () => {
    identity = (await db.getAll('identity'))?.[0];
    return identity && condition(identity);
  });
  return identity;
};

export const getPropertiesItem = async (
  condition: (properties: PropertiesSchema) => boolean = () => true,
) => {
  let properties: PropertiesSchema | undefined;
  await vi.waitUntil(async () => {
    properties = (await db.getAll('properties'))?.[0];
    return properties && condition(properties);
  });
  return properties;
};

export const setupIdentityModel = async (
  {
    onesignalID,
  }: {
    onesignalID?: string;
  } = {
    onesignalID: ONESIGNAL_ID,
  },
) => {
  const newIdentityModel = new IdentityModel();
  if (onesignalID) {
    newIdentityModel.onesignalId = onesignalID;
  }
  OneSignal.coreDirector.identityModelStore.replace(
    newIdentityModel,
    ModelChangeTags.NO_PROPOGATE,
  );

  // wait for db to be updated
  await getIdentityItem((i) => i.onesignal_id === onesignalID);
};

export const setupPropertiesModel = async (
  {
    onesignalID,
  }: {
    onesignalID?: string;
  } = {
    onesignalID: ONESIGNAL_ID,
  },
) => {
  const newPropertiesModel = new PropertiesModel();
  if (onesignalID) {
    newPropertiesModel.onesignalId = onesignalID;
  }
  OneSignal.coreDirector.propertiesModelStore.replace(
    newPropertiesModel,
    ModelChangeTags.NO_PROPOGATE,
  );

  // wait for db to be updated
  await getPropertiesItem((p) => p.onesignalId === onesignalID);
};

export const updateIdentityModel = async <
  T extends keyof IdentitySchema & string,
>(
  property: T,
  value?: IdentitySchema[T],
) => {
  const identityModel = OneSignal.coreDirector.getIdentityModel();
  identityModel.setProperty(property, value, ModelChangeTags.NO_PROPOGATE);
};

export const updatePropertiesModel = async <
  T extends Exclude<
    keyof PropertiesSchema,
    'modelId' | 'modelName' | 'first_active' | 'last_active'
  >,
>(
  property: T,
  value?: PropertiesSchema[T],
) => {
  const propertiesModel = OneSignal.coreDirector.getPropertiesModel();
  propertiesModel.setProperty(property, value, ModelChangeTags.NO_PROPOGATE);
};

export const setupSubscriptionModel = async (
  id: string | undefined,
  token: string | undefined,
) => {
  const subscriptionModel = new SubscriptionModel();
  subscriptionModel.id = id || '';
  subscriptionModel.token = token || '';
  OneSignal.coreDirector.subscriptionModelStore.replaceAll(
    [subscriptionModel],
    ModelChangeTags.NO_PROPOGATE,
  );
};
