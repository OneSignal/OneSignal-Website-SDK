import { get } from '../api/base';
import { db, getOptionsValue } from '../database/client';
import {
  clearFeatureFlags,
  getFeatureFlags,
  getFeatureFlagsAppId,
  getFeatureOverrides,
  setFeatureFlags,
} from '../helpers/localStorage';
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
// The worker mirror is written first; when that write is dropped, the page
// list is left as is so the page and the worker keep the same flags.
export async function refreshFeatureFlags(appId: string): Promise<void> {
  try {
    const overrides = getFeatureOverrides();
    // Bypasses Log so the warning shows in production builds, where Log is silent below trace.
    if (overrides.length) console.warn('OneSignal: feature flag overrides are active:', overrides);

    // Flags are per app, so a list cached for another app is dropped before the fetch.
    const cachedAppId = getFeatureFlagsAppId();
    if (cachedAppId && cachedAppId !== appId) {
      clearFeatureFlags();
      await db.put('Options', { key: 'featureFlags', value: null });
    }

    const fresh = await fetchFeatureFlags(appId);
    const flags = fresh ?? getFeatureFlags();
    // `db.put` resolves to the key when the write commits and to undefined when
    // the circuit breaker drops it.
    const mirrored = await db.put('Options', {
      key: 'featureFlags',
      value: JSON.stringify([...overrides, ...flags]),
    });
    if (mirrored === undefined) {
      Log._warn('Feature flags not mirrored to the worker, keeping the cached list');
      return;
    }
    if (fresh) setFeatureFlags(appId, fresh);
  } catch (e) {
    Log._warn('Feature flags refresh failed', e);
  }
}

async function fetchFeatureFlags(appId: string): Promise<string[] | undefined> {
  try {
    const { ok, result } = await get<FeaturesResponse>(`apps/${appId}/sdk/features/web/${VERSION}`);
    if (!ok || !Array.isArray(result?.features)) return undefined;
    return result.features.filter((f) => typeof f === 'string');
  } catch (e) {
    Log._warn('Feature flags fetch failed', e);
    return undefined;
  }
}
