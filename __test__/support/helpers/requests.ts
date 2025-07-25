import { http, HttpResponse } from 'msw';
import { ISubscription, IUserProperties } from 'src/core/types/api';
import { ConfigIntegrationKind } from 'src/shared/models/AppConfig';
import {
  APP_ID,
  DUMMY_ONESIGNAL_ID,
  DUMMY_SUBSCRIPTION_ID,
} from '../constants';
import TestContext from '../environment/TestContext';
import { server } from '../mocks/server';

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// configs
const serverConfig = TestContext.getFakeServerAppConfig(
  ConfigIntegrationKind.Custom,
);

export const mockServerConfig = () => {
  return http.get('**/sync/*/web', ({ request }) => {
    const url = new URL(request.url);
    const callbackParam = url.searchParams.get('callback');
    return new HttpResponse(
      `${callbackParam}(${JSON.stringify(serverConfig)})`,
      {
        headers: {
          'Content-Type': 'application/javascript',
        },
      },
    );
  });
};
export const mockPageStylesCss = () => {
  return http.get(
    'https://onesignal.com/sdks/web/v16/OneSignalSDK.page.styles.css',
    () => {
      return new HttpResponse('/* CSS */', {
        headers: { 'Content-Type': 'text/css' },
      });
    },
  );
};

export const getHandler = ({
  uri,
  method,
  status,
  response = {},
  retryAfter,
  callback,
}: {
  uri: string;
  method: 'patch' | 'delete' | 'post' | 'get';
  status: number;
  response?: object;
  retryAfter?: number;
  callback?: (object?: unknown) => void;
}) => {
  server.use(
    http[method](uri, async ({ request }) => {
      try {
        const data = await request.json();
        callback?.(data);
      } catch {
        // some requests don't have a body
        callback?.();
      }

      return HttpResponse.json(response, {
        status,
        headers: retryAfter
          ? { 'Retry-After': retryAfter?.toString() }
          : undefined,
      });
    }),
  );
};

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// alias
const getSetAliasUri = (onesignalId: string = DUMMY_ONESIGNAL_ID) =>
  `**/apps/${APP_ID}/users/by/onesignal_id/${onesignalId}/identity`;
const getDeleteAliasUri = (onesignalId: string = DUMMY_ONESIGNAL_ID) =>
  `**/apps/${APP_ID}/users/by/onesignal_id/${onesignalId}/identity/*`;

export const addAliasFn = vi.fn();
export const setAddAliasResponse = ({
  onesignalId,
}: { onesignalId?: string } = {}) =>
  getHandler({
    uri: getSetAliasUri(onesignalId),
    method: 'patch',
    status: 200,
    callback: addAliasFn,
  });
export const setAddAliasError = ({
  onesignalId,
  status,
  retryAfter,
}: {
  onesignalId?: string;
  status: number;
  retryAfter?: number;
}) =>
  getHandler({
    uri: getSetAliasUri(onesignalId),
    method: 'patch',
    status,
    retryAfter,
  });

export const deleteAliasFn = vi.fn();
export const setDeleteAliasResponse = ({
  onesignalId,
}: { onesignalId?: string } = {}) =>
  getHandler({
    uri: getDeleteAliasUri(onesignalId),
    method: 'delete',
    status: 200,
    callback: deleteAliasFn,
  });

export const setDeleteAliasError = ({
  onesignalId,
  status,
  retryAfter,
}: {
  onesignalId?: string;
  status: number;
  retryAfter?: number;
}) =>
  getHandler({
    uri: getDeleteAliasUri(onesignalId),
    method: 'delete',
    status,
    retryAfter,
  });

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// subscription
const getSetSubscriptionUri = (onesignalId = DUMMY_ONESIGNAL_ID) =>
  `**/apps/${APP_ID}/users/by/onesignal_id/${onesignalId}/subscriptions`;

export const createSubscriptionFn = vi.fn();
export const setCreateSubscriptionResponse = ({
  onesignalId,
  response = {},
}: { onesignalId?: string; response?: object } = {}) =>
  getHandler({
    uri: getSetSubscriptionUri(onesignalId),
    method: 'post',
    status: 200,
    response,
    callback: createSubscriptionFn,
  });

export const deleteSubscriptionFn = vi.fn();

const getSetDeleteSubscriptionUri = (subscriptionId = DUMMY_SUBSCRIPTION_ID) =>
  `**/apps/${APP_ID}/subscriptions/${subscriptionId}`;

export const setDeleteSubscriptionResponse = ({
  subscriptionId,
  response = {},
}: { subscriptionId?: string; response?: object } = {}) =>
  getHandler({
    uri: getSetDeleteSubscriptionUri(subscriptionId),
    method: 'delete',
    status: 200,
    response,
    callback: deleteSubscriptionFn,
  });

export const updateSubscriptionFn = vi.fn();
export const getUpdateSubscriptionUri = (
  subscriptionId = DUMMY_SUBSCRIPTION_ID,
) => `**/apps/${APP_ID}/subscriptions/${subscriptionId}`;
export const setUpdateSubscriptionResponse = ({
  subscriptionId,
  response = {},
}: { subscriptionId?: string; response?: object } = {}) =>
  getHandler({
    uri: getUpdateSubscriptionUri(subscriptionId),
    method: 'patch',
    status: 200,
    response,
    callback: updateSubscriptionFn,
  });

// transfer subscription
export const transferSubscriptionFn = vi.fn();

export const getTransferSubscriptionUri = (
  subscriptionId = DUMMY_SUBSCRIPTION_ID,
) => `**/apps/${APP_ID}/subscriptions/${subscriptionId}/owner`;

export const setTransferSubscriptionResponse = ({
  subscriptionId,
  response = {},
}: { subscriptionId?: string; response?: object } = {}) =>
  getHandler({
    uri: getTransferSubscriptionUri(subscriptionId),
    method: 'patch',
    status: 200,
    response,
    callback: transferSubscriptionFn,
  });

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// user
const getUserUri = (onesignalId = DUMMY_ONESIGNAL_ID) =>
  `**/apps/${APP_ID}/users/by/onesignal_id/${onesignalId}`;

// get user
export const getUserFn = vi.fn();
export const setGetUserResponse = ({
  onesignalId = DUMMY_ONESIGNAL_ID,
  newOnesignalId = DUMMY_ONESIGNAL_ID,
  externalId,
  subscriptions = [],
  properties = {},
}: {
  onesignalId?: string;
  newOnesignalId?: string;
  externalId?: string;
  subscriptions?: Partial<ISubscription>[];
  properties?: Partial<IUserProperties>;
} = {}) =>
  getHandler({
    uri: getUserUri(onesignalId),
    method: 'get',
    status: 200,
    response: {
      identity: {
        onesignal_id: newOnesignalId,
        external_id: externalId,
      },
      subscriptions,
      properties,
    },
    callback: getUserFn,
  });

// get user error
export const setGetUserError = ({
  onesignalId = DUMMY_ONESIGNAL_ID,
  status,
  retryAfter,
}: {
  onesignalId?: string;
  status: number;
  retryAfter?: number;
}) =>
  getHandler({
    uri: getUserUri(onesignalId),
    method: 'get',
    status,
    retryAfter,
  });

// create user
const getCreateUserUri = () => `**/apps/${APP_ID}/users`;
export const createUserFn = vi.fn();
export const setCreateUserResponse = ({
  onesignalId = DUMMY_ONESIGNAL_ID,
  subscriptions = [],
  externalId,
}: {
  onesignalId?: string;
  subscriptions?: Partial<ISubscription>[];
  externalId?: string;
} = {}) =>
  getHandler({
    uri: getCreateUserUri(),
    method: 'post',
    status: 200,
    response: {
      identity: {
        onesignal_id: onesignalId,
        external_id: externalId,
      },
      subscriptions,
    },
    callback: createUserFn,
  });

export const setCreateUserError = ({
  status,
  retryAfter,
}: {
  status: number;
  retryAfter?: number;
}) =>
  getHandler({ uri: getCreateUserUri(), method: 'post', status, retryAfter });

// update user
export const updateUserFn = vi.fn();

const getUpdateUserUri = (onesignalId = DUMMY_ONESIGNAL_ID) =>
  `**/apps/${APP_ID}/users/by/onesignal_id/${onesignalId}`;

export const setUpdateUserResponse = ({
  onesignalId = DUMMY_ONESIGNAL_ID,
  response = {},
}: { onesignalId?: string; response?: object } = {}) =>
  getHandler({
    uri: getUpdateUserUri(onesignalId),
    method: 'patch',
    status: 200,
    response,
    callback: updateUserFn,
  });

export const setUpdateUserError = ({
  onesignalId = DUMMY_ONESIGNAL_ID,
  status,
  retryAfter,
}: {
  onesignalId?: string;
  status: number;
  retryAfter?: number;
}) =>
  getHandler({
    uri: getUpdateUserUri(onesignalId),
    method: 'patch',
    status,
    retryAfter,
  });

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// custom events
const getCustomEventsUri = () =>
  `**/apps/${APP_ID}/integrations/sdk/custom_events`;
export const sendCustomEventFn = vi.fn();
export const setSendCustomEventResponse = () =>
  getHandler({
    uri: getCustomEventsUri(),
    method: 'post',
    status: 200,
    callback: sendCustomEventFn,
  });
