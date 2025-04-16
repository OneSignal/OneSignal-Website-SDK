/**
 * Provides access to the low level preferences. Each key has a known data type, it's value can be fetched/stored as
 * needed. Stored preferences will persist across the lifetime of the app installation.
 */
export interface IPreferencesService {
  /**
   * Retrieve a value identified by the store and key provided.
   *
   * @param store The name of the preference store.
   * @param key The key to retrieve.
   * @param defValue The optional default value to return, if the key was not previously saved.
   * @param type The type of value to retrieve (optional).
   *
   * @return the value in the preference store, or defValue if not previously saved.
   */
  getValue<T = unknown | null>(store: string, key: string, defValue?: T): T;

  /**
   * Save a value identified by the store and key provided.
   *
   * @param store The name of the preference store.
   * @param key The key to save.
   * @param value The value to save.
   * @param type The type of value to save (optional).
   */
  setValue<T>(store: string, key: string, value: T | null): void;
}
