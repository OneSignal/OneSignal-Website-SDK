import {
  DeliveryPlatformKind,
  type DeliveryPlatformKindValue,
} from '../models/DeliveryPlatformKind';
import { SubscriptionType } from '../subscriptions/constants';
import type { SubscriptionTypeValue } from '../subscriptions/types';
import { Browser } from '../useragent/constants';
import { getBrowserName, getBrowserVersion } from '../useragent/detect';
import { API_ORIGIN, API_TYPE, IS_SERVICE_WORKER } from '../utils/EnvVariables';
import { EnvironmentKind } from './constants';

export const isBrowser = typeof window !== 'undefined';

export const hasSafariWindow = () =>
  isBrowser && typeof window.safari !== 'undefined';

export const supportsServiceWorkers = () => {
  if (IS_SERVICE_WORKER) return true;
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
};

export const windowEnvString = IS_SERVICE_WORKER ? 'Service Worker' : 'Browser';

export const useSafariLegacyPush = () =>
  isBrowser && window.safari?.pushNotification != undefined;

export const supportsVapidPush =
  typeof PushSubscriptionOptions !== 'undefined' &&
  // eslint-disable-next-line no-prototype-builtins
  PushSubscriptionOptions.prototype.hasOwnProperty('applicationServerKey');

export const useSafariVapidPush = () =>
  getBrowserName() === Browser.Safari &&
  supportsVapidPush &&
  !useSafariLegacyPush();

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

export const getSubscriptionType = (): SubscriptionTypeValue => {
  const isFirefox = getBrowserName() === Browser.Firefox;
  if (isFirefox) {
    return SubscriptionType.FirefoxPush;
  }
  if (useSafariVapidPush()) {
    return SubscriptionType.SafariPush;
  }
  if (useSafariLegacyPush()) {
    return SubscriptionType.SafariLegacyPush;
  }
  // Other browsers, like Edge, are Chromium based so we consider them "Chrome".
  return SubscriptionType.ChromePush;
};

/**
 * Get the legacy player.device_type
 * NOTE: Use getSubscriptionType() instead when possible.
 */
export function getDeviceType(): DeliveryPlatformKindValue {
  switch (getSubscriptionType()) {
    case SubscriptionType.FirefoxPush:
      return DeliveryPlatformKind.Firefox;
    case SubscriptionType.SafariLegacyPush:
      return DeliveryPlatformKind.SafariLegacy;
    case SubscriptionType.SafariPush:
      return DeliveryPlatformKind.SafariVapid;
  }
  return DeliveryPlatformKind.ChromeLike;
}

export function getDeviceOS(): string {
  return String(getBrowserVersion());
}

export function getDeviceModel(): string {
  return navigator.platform;
}
