type UserNamespaceProperties = {
    onesignalId: string | undefined;
    externalId: string | undefined;
  };

  type UserChangeEvent = {
    current: UserNamespaceProperties;
  };

  export default UserChangeEvent;
