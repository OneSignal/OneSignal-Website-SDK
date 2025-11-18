import { IDManager } from './IDManager';

describe('IDManager', () => {
  test('_createLocalId uses prefix and is unique-ish', () => {
    // mock crypto.randomUUID to deterministic value
    const uuids = ['u1', 'u2', 'u3'];
    let i = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(global as any, 'crypto', 'get').mockReturnValue({
      randomUUID: () => uuids[i++],
    });
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



