import { bowserCastle } from '../utils/bowserCastle';
import { API_ORIGIN, API_TYPE, IS_SERVICE_WORKER } from '../utils/EnvVariables';

export const EnvironmentKind = {
  Development: 'development',
  Staging: 'staging',
  Production: 'production',
} as const;

export const isBrowser = typeof window !== 'undefined';

export const supportsServiceWorkers = () => {
  if (IS_SERVICE_WORKER) return true;
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
};

export const windowEnvString = IS_SERVICE_WORKER ? 'Service Worker' : 'Browser';

export const useSafariLegacyPush =
  isBrowser && window.safari?.pushNotification != undefined;

export const supportsVapidPush =
  typeof PushSubscriptionOptions !== 'undefined' &&
  // eslint-disable-next-line no-prototype-builtins
  PushSubscriptionOptions.prototype.hasOwnProperty('applicationServerKey');

export const useSafariVapidPush = () =>
  bowserCastle().name == 'safari' && supportsVapidPush && !useSafariLegacyPush;

// for determing the api url
const API_URL_PORT = 3000;
const TURBINE_API_URL_PORT = 18080;

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
