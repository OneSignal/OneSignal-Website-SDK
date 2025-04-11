export interface IIdentityBackendService {
  /**
   * Set one or more aliases for the user identified by the aliasLabel/aliasValue provided.
   * If there is a non-successful response from the backend, a BackendException should be thrown with response data.
   *
   * @param appId - The ID of the OneSignal application this user exists under.
   * @param aliasLabel - The alias label to retrieve the user under.
   * @param aliasValue - The identifier within the aliasLabel that identifies the user to retrieve.
   * @param identities - The identities that are to be created.
   * @throws BackendException
   */
  setAlias(
    appId: string,
    aliasLabel: string,
    aliasValue: string,
    identities: Record<string, string>,
  ): Promise<Record<string, string>>;

  /**
   * Delete the aliasLabelToDelete from the user identified by the aliasLabel/aliasValue provided.
   * If there is a non-successful response from the backend, a BackendException should be thrown with response data.
   *
   * @param appId - The ID of the OneSignal application this user exists under.
   * @param aliasLabel - The alias label to retrieve the user under.
   * @param aliasValue - The identifier within the aliasLabel that identifies the user to retrieve.
   * @param aliasLabelToDelete - The alias label to delete from the user identified.
   * @throws BackendException
   */
  deleteAlias(
    appId: string,
    aliasLabel: string,
    aliasValue: string,
    aliasLabelToDelete: string,
  ): Promise<void>;
}

export const IdentityConstants = {
  /**
   * The alias label for the external ID alias.
   */
  EXTERNAL_ID: 'external_id',

  /**
   * The alias label for the internal OneSignal ID alias.
   */
  ONESIGNAL_ID: 'onesignal_id',
} as const;
