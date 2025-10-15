import { type Operation } from 'src/core/operations/Operation';

/**
 * Interface for retrieving rebuild operations for a user.
 */
export interface IRebuildUserService {
  /**
   * Retrieve the list of operations for rebuilding a user, if the
   * onesignalId provided represents the current user.
   *
   * @param appId - The ID of the app.
   * @param onesignalId - The ID of the user to retrieve operations for.
   * @returns A list of operations if the ID is for the current user, or null otherwise.
   */
  _getRebuildOperationsIfCurrentUser(
    appId: string,
    onesignalId: string,
  ): Promise<Operation[] | null>;
}
