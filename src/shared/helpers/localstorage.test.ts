import {
  getTempItem,
  isLocalStorageSupported,
  setTempItem,
} from './localStorage';

const localStorageSpy = vi.spyOn(window, 'localStorage', 'get');

vi.useFakeTimers();

describe('TimedLocalStorage', () => {
  test('can check if localStorage is supported', () => {
    expect(isLocalStorageSupported()).toBe(true);

    // @ts-expect-error - purposely setting to undefined
    localStorageSpy.mockReturnValueOnce(undefined);
    expect(isLocalStorageSupported()).toBe(false);
  });

  test('can set and get item with expiration', () => {
    setTempItem('my-key', 'my-value', 3);
    expect(getTempItem('my-key')).toBe('my-value');

    vi.advanceTimersByTime(3 * 60 * 1000);
    expect(getTempItem('my-key')).toBe(null);
  });

  test('can set and get an object', () => {
    setTempItem('my-key', { value: 'my-value' });
    expect(getTempItem('my-key')).toEqual({ value: 'my-value' });

    // should do nothing if localStorage is not supported
    // @ts-expect-error - purposely setting to undefined
    localStorageSpy.mockReturnValueOnce(undefined);
    setTempItem('my-key-2', { value: 'my-value' });

    // @ts-expect-error - purposely setting to undefined
    localStorageSpy.mockReturnValueOnce(undefined);
    expect(getTempItem('my-key-2')).toBe(null);
  });

  test('can remove item', () => {
    setTempItem('temp-key', 'my-value');

    // should do nothing if localStorage is not supported
    // @ts-expect-error - purposely setting to undefined
    localStorageSpy.mockReturnValueOnce(undefined);
    expect(getTempItem('temp-key')).toBe(null);

    // should get item if localStorage is supported
    expect(getTempItem('temp-key')).toBe('my-value');

    // should remove item if localStorage is supported
    localStorage.removeItem('temp-key');
    expect(getTempItem('temp-key')).toBe(null);
  });
});
