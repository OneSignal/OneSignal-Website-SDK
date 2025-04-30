import { http, HttpResponse } from 'msw';
import { ConfigIntegrationKind } from 'src/shared/models/AppConfig';
import { APP_ID, DUMMY_ONESIGNAL_ID } from '../constants';
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

const getHandler = ({
  uri,
  method,
  status,
  response = {},
  retryAfter,
  callback,
}: {
  uri: string;
  method: 'patch' | 'delete';
  status: number;
  response?: object;
  retryAfter?: number;
  callback?: (object?: unknown) => void;
}) => {
  server.use(
    http[method](uri, async ({ request }) => {
      if (method !== 'delete') {
        callback?.(await request.json());
      } else {
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
  `**/api/v1/apps/${APP_ID}/users/by/onesignal_id/${onesignalId}/identity`;
const getDeleteAliasUri = (onesignalId: string = DUMMY_ONESIGNAL_ID) =>
  `**/api/v1/apps/${APP_ID}/users/by/onesignal_id/${onesignalId}/identity/*`;

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
  onesignalId: string;
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
  onesignalId: string;
  status: number;
  retryAfter?: number;
}) =>
  getHandler({
    uri: getDeleteAliasUri(onesignalId),
    method: 'delete',
    status,
    retryAfter,
  });
