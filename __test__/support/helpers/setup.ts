import { ONESIGNAL_ID } from '__test__/constants';
import { IdentityModel } from 'src/core/models/IdentityModel';
import { PropertiesModel } from 'src/core/models/PropertiesModel';
import { SubscriptionModel } from 'src/core/models/SubscriptionModel';
import { ModelChangeTags } from 'src/core/types/models';
import { ResourceLoadState } from 'src/page/services/DynamicResourceLoader';
import { db } from 'src/shared/database/client';
import type {
  IdentitySchema,
  PropertiesSchema,
  SubscriptionSchema,
} from 'src/shared/database/types';

export const setIsPushEnabled = async (isPushEnabled: boolean) => {
  await db.put('Options', { key: 'isPushEnabled', value: isPushEnabled });
};

/**
 * Waits for indexedDB identity table to be populated with the correct identity.
 */
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

/**
 * Waits for indexedDB properties table to be populated with the correct properties.
 */
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

/**
 * Waits for indexedDB subscriptions table to be populated with the correct number of subscriptions.
 */
export const getDbSubscriptions = async (length: number) => {
  let subscriptions: SubscriptionSchema[] = [];
  await vi.waitUntil(async () => {
    subscriptions = await db.getAll('subscriptions');
    return subscriptions.length === length;
  });
  return subscriptions;
};

/**
 * Update identity model but not trigger action to trigger api call.
 */
export const setupIdentityModel = async (
  onesignalID: string = ONESIGNAL_ID,
) => {
  const newIdentityModel = new IdentityModel();
  newIdentityModel.onesignalId = onesignalID;
  OneSignal.coreDirector.identityModelStore.replace(
    newIdentityModel,
    ModelChangeTags.NO_PROPAGATE,
  );
};

/**
 * Update properties model but not trigger action to trigger api call.
 */
export const setupPropertiesModel = async (
  onesignalID: string = ONESIGNAL_ID,
) => {
  const newPropertiesModel = new PropertiesModel();
  newPropertiesModel.onesignalId = onesignalID;
  OneSignal.coreDirector.propertiesModelStore.replace(
    newPropertiesModel,
    ModelChangeTags.NO_PROPAGATE,
  );

  // wait for db to be updated
  await getPropertiesItem((p) => p.onesignalId === onesignalID);
};

/**
 * Update identity model but not trigger action to trigger api call.
 */
export const updateIdentityModel = async <
  T extends keyof IdentitySchema & string,
>(
  property: T,
  value?: IdentitySchema[T],
) => {
  const identityModel = OneSignal.coreDirector.getIdentityModel();
  identityModel.setProperty(property, value, ModelChangeTags.NO_PROPAGATE);
};

/**
 * Update properties model but not trigger action to trigger api call.
 */
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
  propertiesModel.setProperty(property, value, ModelChangeTags.NO_PROPAGATE);
};

/**
 * Update subscription model but not trigger action to trigger api call.
 */
export const setupSubscriptionModel = async (
  id: string | undefined,
  token: string | undefined,
) => {
  const subscriptionModel = new SubscriptionModel();
  subscriptionModel.id = id || '';
  subscriptionModel.token = token || '';
  OneSignal.coreDirector.subscriptionModelStore.replaceAll(
    [subscriptionModel],
    ModelChangeTags.NO_PROPAGATE,
  );
};

/**
 * In case some action triggers a call to loadSdkStylesheet, we need to mock it.
 */
export const setupLoadStylesheet = async () => {
  vi.spyOn(
    OneSignal.context.dynamicResourceLoader,
    'loadSdkStylesheet',
  ).mockResolvedValue(ResourceLoadState.Loaded);
};
