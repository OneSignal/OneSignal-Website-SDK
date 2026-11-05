import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';

import { Subscription } from '../models/Subscription';
import { db, getOptionsValue, isReadwriteWedged } from './client';
import { getSubscription, setSubscription } from './subscription';

const { env } = vi.hoisted(() => ({ env: { isServiceWorker: false } }));
vi.mock('../utils/env', async (importOriginal) => ({
  ...(await importOriginal()),
  get IS_SERVICE_WORKER() {
    return env.isServiceWorker;
  },
}));

vi.mock('./client', async (importOriginal) => ({
  ...(await importOriginal()),
  isReadwriteWedged: vi.fn(() => false),
}));

const OPTED_OUT_KEY = 'os_optedOut';

const optedOutSubscription = () => {
  const subscription = new Subscription();
  subscription.optedOut = true;
  return subscription;
};

beforeEach(async () => {
  env.isServiceWorker = false;
  vi.mocked(isReadwriteWedged).mockReturnValue(false);
  localStorage.clear();
  await db.delete('Options', 'optedOut');
  await db.delete('Options', 'subscription');
});

describe('page', () => {
  test('setSubscription saves optedOut in localStorage and not in IndexedDB', async () => {
    await setSubscription(optedOutSubscription());

    expect(localStorage.getItem(OPTED_OUT_KEY)).toBe('true');
    expect(await getOptionsValue('optedOut')).toBeNull();
  });

  test('getSubscription prefers localStorage over a stale IndexedDB value', async () => {
    await db.put('Options', { key: 'optedOut', value: false });
    localStorage.setItem(OPTED_OUT_KEY, 'true');

    expect((await getSubscription()).optedOut).toBe(true);
  });

  test('getSubscription migrates a legacy IndexedDB value into localStorage', async () => {
    await db.put('Options', { key: 'optedOut', value: true });

    expect((await getSubscription()).optedOut).toBe(true);
    expect(localStorage.getItem(OPTED_OUT_KEY)).toBe('true');

    await db.delete('Options', 'optedOut');
    expect((await getSubscription()).optedOut).toBe(true);
  });

  test('getSubscription migrates the older "subscription" IndexedDB key', async () => {
    await db.put('Options', { key: 'subscription', value: false });

    expect((await getSubscription()).optedOut).toBe(true);
    expect(localStorage.getItem(OPTED_OUT_KEY)).toBe('true');
  });

  test('getSubscription does not migrate while IndexedDB is wedged', async () => {
    vi.mocked(isReadwriteWedged).mockReturnValue(true);

    expect((await getSubscription()).optedOut).toBe(false);
    expect(localStorage.getItem(OPTED_OUT_KEY)).toBeNull();

    vi.mocked(isReadwriteWedged).mockReturnValue(false);
    await db.put('Options', { key: 'optedOut', value: true });
    expect((await getSubscription()).optedOut).toBe(true);
    expect(localStorage.getItem(OPTED_OUT_KEY)).toBe('true');
  });
});

describe('service worker', () => {
  beforeEach(() => {
    env.isServiceWorker = true;
  });

  test('setSubscription saves optedOut in IndexedDB and not in localStorage', async () => {
    await setSubscription(optedOutSubscription());

    expect(await getOptionsValue('optedOut')).toBe(true);
    expect(localStorage.getItem(OPTED_OUT_KEY)).toBeNull();
  });

  test('getSubscription reads optedOut from IndexedDB and ignores localStorage', async () => {
    localStorage.setItem(OPTED_OUT_KEY, 'true');
    await db.put('Options', { key: 'optedOut', value: false });

    expect((await getSubscription()).optedOut).toBe(false);
  });
});
