import { beforeEach, describe, expect, test } from 'vite-plus/test';

import {
  getConsentGiven as getStorageConsentGiven,
  setConsentGiven as setStorageConsentGiven,
} from '../helpers/localStorage';
import { db } from './client';
import { getConsentGiven } from './config';

describe('getConsentGiven', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('defaults to false when nothing is stored', async () => {
    expect(await getConsentGiven()).toBe(false);
  });

  test('reads the value persisted in localStorage', async () => {
    setStorageConsentGiven(true);
    expect(await getConsentGiven()).toBe(true);

    setStorageConsentGiven(false);
    expect(await getConsentGiven()).toBe(false);
  });

  test('migrates a legacy IndexedDB value into localStorage', async () => {
    await db.put('Options', { key: 'userConsent', value: true });
    expect(getStorageConsentGiven()).toBeNull();

    expect(await getConsentGiven()).toBe(true);
    expect(getStorageConsentGiven()).toBe(true);

    // Once migrated, the value survives even if the IndexedDB row is gone --
    // a wedged PWA can no longer drop it.
    await db.delete('Options', 'userConsent');
    expect(await getConsentGiven()).toBe(true);
  });

  test('prefers localStorage over a stale legacy IndexedDB value', async () => {
    await db.put('Options', { key: 'userConsent', value: true });
    setStorageConsentGiven(false);
    expect(await getConsentGiven()).toBe(false);
  });
});
