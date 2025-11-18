import { TestEnvironment } from '__test__/support/environment/TestEnvironment';
import Log from 'src/shared/libraries/Log';
import { vi } from 'vitest';
import TagManager from './TagManager';

describe('TagManager', () => {
  beforeEach(() => {
    TestEnvironment.initialize({ initOneSignalId: true, initUserAndPushSubscription: false });
    vi.restoreAllMocks();
    // ensure addTags exists and is stubbed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (OneSignal as any).User.addTags = vi.fn().mockResolvedValue(undefined);
  });

  test('_storeTagValuesToUpdate/_storeRemotePlayerTags set internal state', () => {
    const tm = new TagManager(OneSignal._context);
    tm._storeRemotePlayerTags({ a: '1' });
    tm._storeTagValuesToUpdate({ a: true, b: false });
    expect(OneSignal._context._tagManager._remoteTags).toEqual({ a: '1' });
    expect((tm as any)._tagsFromTaggingContainer).toEqual({ a: true, b: false });
  });

  test('_sendTags calls addTags when diff is non-empty and returns diff', async () => {
    const tm = new TagManager(OneSignal._context);
    tm._storeRemotePlayerTags({ a: '1' });
    tm._storeTagValuesToUpdate({ a: false, b: true }); // converts to { a:0, b:1 } and diff => { a:0, b:1 } vs { a:1 } -> { a:0, b:1 }
    const result = await tm._sendTags();
    expect(OneSignal.User.addTags).toHaveBeenCalledWith(result);
    expect(result).toMatchObject({ a: '0', b: '1' });
  });

  test('_sendTags returns {} and warns when no change', async () => {
    const warnSpy = vi.spyOn(Log, '_warn').mockImplementation(() => undefined as any);
    const tm = new TagManager(OneSignal._context);
    // Ensure this instance uses the same remote tags that will be diffed
    (tm as any)._remoteTags = { c: '1' };
    tm._storeTagValuesToUpdate({ c: true }); // converts to { c:'1' } -> diff {}

    const result = await tm._sendTags();
    expect(result).toEqual({});
    expect(warnSpy).toHaveBeenCalled();
    expect(OneSignal.User.addTags).not.toHaveBeenCalled();
  });
});


