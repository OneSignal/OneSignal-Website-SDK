import { UserPropertiesModel } from '../models/UserPropertiesModel';

// TODO: Remove with web sdk refactor work
export type UpdateUserPayload = {
  properties?: UserPropertiesModel;
  refresh_device_metadata?: boolean;
  // TO DO: narrow deltas type to include only session deltas
  deltas?: Partial<UserPropertiesModel>;
};
