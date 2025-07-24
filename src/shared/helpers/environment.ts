import { API_ORIGIN, API_TYPE } from '../utils/EnvVariables';

export const isServiceWorkerEnv =
  typeof self !== 'undefined' &&
  typeof ServiceWorkerGlobalScope !== 'undefined';

export const isSafariLegacyPush =
  typeof window !== 'undefined' && window.safari?.pushNotification != undefined;

// for determing the api url
const API_URL_PORT = 3000;
const TURBINE_API_URL_PORT = 18080;
const EnvironmentKind = {
  Development: 'development',
  Staging: 'staging',
  Production: 'production',
} as const;

export const getOneSignalApiUrl = ({
  action,
  legacy = false,
}: {
  action?: string;
  legacy?: boolean;
} = {}): URL => {
  // using if statements to have better dead code elimination
  if (API_TYPE === EnvironmentKind.Development) {
    return isTurbineEndpoint(action)
      ? new URL(`http://${API_ORIGIN}:${TURBINE_API_URL_PORT}/api/v1/`)
      : new URL(`http://${API_ORIGIN}:${API_URL_PORT}/api/v1/`);
  }

  if (API_TYPE === EnvironmentKind.Staging)
    return new URL(`https://${API_ORIGIN}/api/v1/`);

  if (API_TYPE === EnvironmentKind.Production)
    return new URL(
      legacy ? 'https://onesignal.com/api/v1/' : 'https://api.onesignal.com/',
    );

  throw new Error('Invalid API type');
};

const TURBINE_ENDPOINTS = ['outcomes', 'on_focus'];
const isTurbineEndpoint = (action?: string): boolean => {
  if (!action) {
    return false;
  }

  return TURBINE_ENDPOINTS.some(
    (turbine_endpoint) => action.indexOf(turbine_endpoint) > -1,
  );
};
