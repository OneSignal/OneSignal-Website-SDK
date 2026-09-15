import { get } from '../api/base';
import { getFeatureFlags, getFeatureOverrides, setFeatureFlags } from '../helpers/localStorage';
import Log from '../libraries/Log';
import { VERSION } from '../utils/env';

export const FeatureFlag = {
  _IdentityVerification: 'sdk_identity_verification',
} as const;

export type FeatureFlagValue = (typeof FeatureFlag)[keyof typeof FeatureFlag];

type FeaturesResponse = { features?: unknown };

// Reads storage on every call so a refresh applies at once, without a cold start.
export function isFeatureEnabled(flag: FeatureFlagValue): boolean {
  return getFeatureOverrides().includes(flag) || getFeatureFlags().includes(flag);
}

// Fetches the flag list once per page load. A failure keeps the cached list.
export async function refreshFeatureFlags(appId: string): Promise<void> {
  const overrides = getFeatureOverrides();
  if (overrides.length) Log._warn('Feature flag overrides are active:', overrides);

  try {
    const { ok, result } = await get<FeaturesResponse>(`apps/${appId}/sdk/features/web/${VERSION}`);
    if (!ok || !Array.isArray(result?.features)) return;
    setFeatureFlags(result.features);
  } catch (e) {
    Log._warn('Feature flags fetch failed', e);
  }
}
