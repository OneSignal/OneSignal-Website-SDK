export interface IdentityModel extends FutureIdentityModel {
  onesignal_id: string;
}

export interface FutureIdentityModel {
  external_id?: string;
  [key: string]: string | undefined;
}

export type SupportedIdentity = IdentityModel | FutureIdentityModel;
