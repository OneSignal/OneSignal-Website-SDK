import { enforceAlias, enforceAppId, timeoutPromise } from './helpers';

vi.useFakeTimers();

describe('context/helpers', () => {
  describe('timeoutPromise', () => {
    test('resolves before timeout', async () => {
      const p = new Promise((resolve) => setTimeout(() => resolve('ok'), 50));
      const raced = timeoutPromise(p, 100);
      vi.advanceTimersByTime(60);
      await expect(raced).resolves.toBe('ok');
    });

    test('rejects on timeout', async () => {
      const never = new Promise((_r) => undefined);
      const raced = timeoutPromise(never, 10);
      vi.advanceTimersByTime(11);
      await expect(raced).rejects.toThrow('Async operation timed out');
    });
  });

  describe('enforceAppId', () => {
    test('throws on empty', () => {
      expect(() => enforceAppId(undefined)).toThrow('App id cannot be empty');
      expect(() => enforceAppId(null)).toThrow('App id cannot be empty');
    });

    test('does not throw on valid', () => {
      expect(() => enforceAppId('abc')).not.toThrow();
    });
  });

  describe('enforceAlias', () => {
    test('throws when label or id is empty', () => {
      expect(() => enforceAlias({ label: '', id: '' })).toThrow(
        'Alias label cannot be empty',
      );
      expect(() => enforceAlias({ label: 'x', id: '' })).toThrow(
        'Alias id cannot be empty',
      );
    });

    test('does not throw on valid', () => {
      expect(() => enforceAlias({ label: 'x', id: 'y' })).not.toThrow();
    });
  });
});
