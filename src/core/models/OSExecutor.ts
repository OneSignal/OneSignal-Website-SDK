import { OSIdentityExecutor } from "../executors/OSIdentityExecutor";
import { OSPropertiesExecutor } from "../executors/OSPropertiesExecutor";
import { OSSubscriptionExecutor } from "../executors/OSSubscriptionExecutor";

export type OSExecutor<Model> = OSIdentityExecutor<Model> | OSPropertiesExecutor<Model> | OSSubscriptionExecutor<Model>;
