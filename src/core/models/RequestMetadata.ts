import { APIHeaders } from '../../shared/models/APIHeaders';

export type RequestMetadata = {
  appId: string;
  subscriptionId?: string;
  jwtHeader?: APIHeaders;
};
