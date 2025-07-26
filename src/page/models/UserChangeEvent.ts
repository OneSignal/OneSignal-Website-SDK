export type UserNamespaceProperties = {
  onesignalId: string | undefined;
  externalId: string | undefined;
};

export type UserChangeEvent = {
  current: UserNamespaceProperties;
};
