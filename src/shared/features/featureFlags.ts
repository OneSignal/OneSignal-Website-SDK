import { get } from '../api/base';
import { db, getOptionsValue } from '../database/client';
import {
  getFeatureFlags,
  getFeatureOverrides,
  parseList,
  setFeatureFlags,
} from '../helpers/localStorage';
import { VERSION } from '../utils/env';

export const FeatureFlag = {
  _IdentityVerification: 'sdk_identity_verification',
  _InlineNotificationImages: 'sdk_web_inline_notification_images',
} as const;

export type FeatureFlagValue = (typeof FeatureFlag)[keyof typeof FeatureFlag];

type FeaturesResponse = { features?: unknown };

// Reads storage on every call so a refresh applies at once, without a cold start.
export function isFeatureEnabled(flag: FeatureFlagValue): boolean {
  return getFeatureOverrides().includes(flag) || getFeatureFlags().includes(flag);
}

// The worker has no localStorage, so the page mirrors the active list into IndexedDB.
export async function isFeatureEnabledInWorker(flag: FeatureFlagValue): Promise<boolean> {
  return parseList(await getOptionsValue<string>('featureFlags')).includes(flag);
}

// Fetches the flag list once per page load; a failure keeps the cached list.
// The page cache is written only after the worker mirror commits, so both see the same flags.
export async function refreshFeatureFlags(appId: string): Promise<void> {
  try {
    const overrides = getFeatureOverrides();
    // Bypasses Log so the warning shows in production builds, where Log is silent below trace.
    if (overrides.length) console.warn('OneSignal: feature flag overrides are active:', overrides);

    const res = await get<FeaturesResponse>([
      'apps',
      appId,
      'sdk',
      'features',
      'web',
      VERSION,
    ]).catch(() => undefined);
    const features = res?.ok && res.result?.features;
    const flags = Array.isArray(features)
      ? features.filter((f) => typeof f === 'string')
      : getFeatureFlags();
    const mirrored = await db.put('Options', {
      key: 'featureFlags',
      value: JSON.stringify([...overrides, ...flags]),
    });
    if (mirrored !== undefined) setFeatureFlags(flags);
  } catch {
    // Storage errors leave the cached lists in place.
  }
}
