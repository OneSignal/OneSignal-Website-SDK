/**
 * Manages IDs that are created locally.
 * Has the ability to generate globally unique identifiers
 * and detect whether a provided ID was generated locally.
 */
export const IDManager = {
  LOCAL_PREFIX: 'local-',

  /**
   * Create a new local ID to be used temporarily prior to backend generation.
   *
   * @returns A new locally generated ID.
   */
  createLocalId(): string {
    return `${this.LOCAL_PREFIX}${crypto.randomUUID()}`;
  },

  /**
   * Determine whether the ID provided is locally generated.
   *
   * @param id - The ID to test.
   * @returns True if the ID was created via createLocalId.
   */
  isLocalId(id: string | undefined): boolean {
    return id?.startsWith(this.LOCAL_PREFIX) ?? false;
  },
};
