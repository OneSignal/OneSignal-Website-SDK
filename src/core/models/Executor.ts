import { IdentityExecutor } from "../executors/IdentityExecutor";
import { PropertiesExecutor } from "../executors/PropertiesExecutor";
import { SubscriptionExecutor } from "../executors/SubscriptionExecutor";

export type Executor<Model> = IdentityExecutor<Model> | PropertiesExecutor<Model> | SubscriptionExecutor<Model>;
