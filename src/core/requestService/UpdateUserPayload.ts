import { UserPropertiesModel } from "../models/UserPropertiesModel";

export type UpdateUserPayload = {
  properties: UserPropertiesModel,
  refresh_device_metadata?: boolean,
  // TO DO: confirm this is correct deltas format
  deltas?: Partial<UserPropertiesModel>,
};
