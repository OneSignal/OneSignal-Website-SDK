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
  getRebuildOperationsIfCurrentUser(
    appId: string,
    onesignalId: string,
  ): Operation[] | null;
}

// Reference: https://documentation.onesignal.com/reference/create-user#body-parameters
export interface IUserProperties {
  country?: string;
  first_active?: number;
  ip?: string;
  last_active?: number;
  lat?: number;
  long?: number;
  language?: string;
  tags?: { [key: string]: string };
  timezone_id?: string;
}
