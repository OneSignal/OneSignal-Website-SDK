export interface IdentityModel {
  onesignalId: string;
  externalId?: string;
  [key: string]: string | undefined;
}
