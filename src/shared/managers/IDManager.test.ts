import { IDManager } from './IDManager';

describe('IDManager', () => {
  test('_createLocalId uses prefix and is unique-ish', () => {
    // mock crypto.randomUUID to deterministic value
    let i = 0;
    const uuids = [
      'a-b-c-d-e',
      'f-g-h-i-j',
    ] satisfies `${string}-${string}-${string}-${string}-${string}`[];
    vi.spyOn(window.crypto, 'randomUUID').mockImplementation(() => uuids[i++]);

    const a = IDManager._createLocalId();
    const b = IDManager._createLocalId();
    expect(a.startsWith(IDManager.LOCAL_PREFIX)).toBe(true);
    expect(b.startsWith(IDManager.LOCAL_PREFIX)).toBe(true);
    expect(a).not.toBe(b);
  });

  test('_isLocalId values', () => {
    expect(IDManager._isLocalId(`${IDManager.LOCAL_PREFIX}abc`)).toBe(true);
    expect(IDManager._isLocalId('xyz')).toBe(false);
    expect(IDManager._isLocalId(undefined)).toBe(false);
    expect(IDManager._isLocalId(null as unknown as string)).toBe(false);
  });
});
