export interface IdentityModel extends FutureIdentityModel {
  onesignalId: string;
}

export interface FutureIdentityModel {
  externalId?: string;
  [key: string]: string | undefined;
}

export type SupportedIdentity = IdentityModel | FutureIdentityModel;
