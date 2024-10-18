export type RequestMetadata = {
  // path parameters
  appId: string;
  subscriptionId?: string;
  // sent as header
  jwtToken?: string;
};
