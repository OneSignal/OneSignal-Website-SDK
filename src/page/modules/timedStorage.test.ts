import * as TimedLocalStorage from './timedStorage';

const localStorageSpy = vi.spyOn(window, 'localStorage', 'get');

vi.useFakeTimers();

describe('TimedLocalStorage', () => {
  test('can check if localStorage is supported', () => {
    expect(TimedLocalStorage.isLocalStorageSupported()).toBe(true);

    // @ts-expect-error - purposely setting to undefined
    localStorageSpy.mockReturnValueOnce(undefined);
    expect(TimedLocalStorage.isLocalStorageSupported()).toBe(false);
  });

  test('can set and get item with expiration', () => {
    TimedLocalStorage.setItem('my-key', 'my-value', 3);
    expect(TimedLocalStorage.getItem('my-key')).toBe('my-value');

    vi.advanceTimersByTime(3 * 60 * 1000);
    expect(TimedLocalStorage.getItem('my-key')).toBe(null);
  });

  test('can set and get an object', () => {
    TimedLocalStorage.setItem('my-key', { value: 'my-value' });
    expect(TimedLocalStorage.getItem('my-key')).toEqual({ value: 'my-value' });

    // should do nothing if localStorage is not supported
    // @ts-expect-error - purposely setting to undefined
    localStorageSpy.mockReturnValueOnce(undefined);
    TimedLocalStorage.setItem('my-key-2', { value: 'my-value' });

    // @ts-expect-error - purposely setting to undefined
    localStorageSpy.mockReturnValueOnce(undefined);
    expect(TimedLocalStorage.getItem('my-key-2')).toBe(null);
  });

  test('can remove item', () => {
    TimedLocalStorage.setItem('temp-key', 'my-value');

    // should do nothing if localStorage is not supported
    // @ts-expect-error - purposely setting to undefined
    localStorageSpy.mockReturnValueOnce(undefined);
    TimedLocalStorage.removeItem('temp-key');
    expect(TimedLocalStorage.getItem('temp-key')).toBe('my-value');

    // should remove item if localStorage is supported
    TimedLocalStorage.removeItem('temp-key');
    expect(TimedLocalStorage.getItem('temp-key')).toBe(null);
  });
});
