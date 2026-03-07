import { ONESIGNAL_ID, PUSH_TOKEN } from '__test__/constants';
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
import type { RawPushSubscription } from 'src/shared/subscriptions/rawPushSubscription';

/**
 * Mocks `delay` from `src/shared/helpers/general` to resolve immediately.
 * Must be called at the top level of a test file (alongside other vi.mock calls).
 */
export const mockDelay = () => {
  vi.mock('src/shared/helpers/general', async (importOriginal) => {
    const mod =
      await importOriginal<typeof import('src/shared/helpers/general')>();
    return { ...mod, delay: vi.fn(() => Promise.resolve()) };
  });
};

export const setIsPushEnabled = async (isPushEnabled: boolean) => {
  await db._put('Options', { key: 'isPushEnabled', value: isPushEnabled });
};

/**
 * Waits for indexedDB identity table to be populated with the correct identity.
 */
export const getIdentityItem = async (
  condition: (identity: IdentitySchema) => boolean = () => true,
) => {
  let identity: IdentitySchema | undefined;
  await vi.waitUntil(
    async () => {
      identity = (await db._getAll('identity'))?.[0];
      return identity && condition(identity);
    },
    { interval: 1 },
  );
  return identity;
};

/**
 * Waits for indexedDB properties table to be populated with the correct properties.
 */
export const getPropertiesItem = async (
  condition: (properties: PropertiesSchema) => boolean = () => true,
) => {
  let properties: PropertiesSchema | undefined;
  await vi.waitUntil(
    async () => {
      properties = (await db._getAll('properties'))?.[0];
      return properties && condition(properties);
    },
    { interval: 1 },
  );
  return properties;
};

/**
 * Waits for indexedDB subscriptions table to be populated with the correct number of subscriptions.
 */
export const getDbSubscriptions = async (length: number) => {
  let subscriptions: SubscriptionSchema[] = [];
  await vi.waitUntil(
    async () => {
      subscriptions = await db._getAll('subscriptions');
      return subscriptions.length === length;
    },
    { interval: 1 },
  );
  return subscriptions;
};

/**
 * Update identity model but not trigger action to trigger api call.
 */
export const setupIdentityModel = async (
  onesignalID: string = ONESIGNAL_ID,
) => {
  const newIdentityModel = new IdentityModel();
  newIdentityModel._onesignalId = onesignalID;
  OneSignal._coreDirector._identityModelStore._replace(
    newIdentityModel,
    ModelChangeTags._NoPropogate,
  );
};

/**
 * Update properties model but not trigger action to trigger api call.
 */
export const setupPropertiesModel = async (
  onesignalID: string = ONESIGNAL_ID,
) => {
  const newPropertiesModel = new PropertiesModel();
  newPropertiesModel._onesignalId = onesignalID;
  OneSignal._coreDirector._propertiesModelStore._replace(
    newPropertiesModel,
    ModelChangeTags._NoPropogate,
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
  const identityModel = OneSignal._coreDirector._getIdentityModel();
  identityModel._setProperty(property, value, ModelChangeTags._NoPropogate);
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
  const propertiesModel = OneSignal._coreDirector._getPropertiesModel();
  propertiesModel._setProperty(property, value, ModelChangeTags._NoPropogate);
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
  OneSignal._coreDirector._subscriptionModelStore._replaceAll(
    [subscriptionModel],
    ModelChangeTags._NoPropogate,
  );
};

/**
 * In case some action triggers a call to loadSdkStylesheet, we need to mock it.
 */
export const setupLoadStylesheet = async () => {
  vi.spyOn(
    OneSignal._context._dynamicResourceLoader,
    '_loadSdkStylesheet',
  ).mockResolvedValue(ResourceLoadState._Loaded);
};

export const getRawPushSubscription = (): RawPushSubscription => ({
  w3cEndpoint: PUSH_TOKEN,
  w3cP256dh: 'w3cP256dh',
  w3cAuth: 'w3cAuth',
  safariDeviceToken: 'safariDeviceToken',
});
