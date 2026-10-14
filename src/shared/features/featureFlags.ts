import { get } from '../api/base';
import { db, getOptionsValue } from '../database/client';
import { getFeatureFlags, getFeatureOverrides, setFeatureFlags } from '../helpers/localStorage';
import Log from '../libraries/Log';
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
  return parseFlagList(await getOptionsValue<string>('featureFlags')).includes(flag);
}

function parseFlagList(json: string | null): string[] {
  try {
    const parsed: unknown = JSON.parse(json ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((f) => typeof f === 'string') : [];
  } catch {
    return [];
  }
}

// Fetches the flag list once per page load. A failure keeps the cached list.
export async function refreshFeatureFlags(appId: string): Promise<void> {
  const overrides = getFeatureOverrides();
  // Bypasses Log so the warning shows in production builds, where Log is silent below trace.
  if (overrides.length) console.warn('OneSignal: feature flag overrides are active:', overrides);

  try {
    const { ok, result } = await get<FeaturesResponse>(`apps/${appId}/sdk/features/web/${VERSION}`);
    if (!ok || !Array.isArray(result?.features)) return;
    setFeatureFlags(result.features);
    await db.put('Options', {
      key: 'featureFlags',
      value: JSON.stringify([...overrides, ...getFeatureFlags()]),
    });
  } catch (e) {
    Log._warn('Feature flags fetch failed', e);
  }
}
