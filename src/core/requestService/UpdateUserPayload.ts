import { UserPropertiesModel } from "../models/UserPropertiesModel";

export type UpdateUserPayload = {
  properties: UserPropertiesModel,
  refresh_device_metadata?: boolean,
  // TO DO: narrow deltas type to include only session deltas
  deltas?: Partial<UserPropertiesModel>,
};
