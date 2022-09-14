import { ExecutorResult } from "../models/ExecutorResult";
import { OSExecutorConfigMap } from "../models/OSExecutorConfig";
import { ModelName } from "../models/SupportedModels";
import { Operation } from "../operationRepo/Operation";

/* I D E N T I T Y */
function addIdentity<Model>(operation: Operation<Model>): ExecutorResult {
  console.log("addIdentity");
  return {
    success: true,
    retriable: true
  };
}

function updateIdentity<Model>(operation: Operation<Model>): ExecutorResult {
  console.log("updateIdentity");
  return {
    success: true,
    retriable: true
  };
}

function removeIdentity<Model>(operation: Operation<Model>): ExecutorResult {
  console.log("removeIdentity");
  return {
    success: true,
    retriable: true
  };
}

/* U S E R   P R O P E R T I E S */
function updateUserProperties<Model>(operation: Operation<Model>): ExecutorResult {
  console.log("updateUserProperty");
  return {
    success: true,
    retriable: true
  };
}

/* S U B S C R I P T I O N S */
function addSubscription<Model>(operation: Operation<Model>): ExecutorResult {
  console.log("addSubscription");
  return {
    success: true,
    retriable: true
  };
}

function removeSubscription<Model>(operation: Operation<Model>): ExecutorResult {
  console.log("removeSubscription");
  return {
    success: true,
    retriable: true
  };
}

function updateSubscription<Model>(operation: Operation<Model>): ExecutorResult {
  console.log("updateSubscription");
  return {
    success: true,
    retriable: true
  };
}

export const OS_EXECUTOR_CONFIG_MAP: OSExecutorConfigMap = {
  [ModelName.Identity]: {
    modelName: ModelName.Identity,
    add: addIdentity,
    update: updateIdentity,
    remove: removeIdentity,
  },
  [ModelName.Properties]: {
    modelName: ModelName.Properties,
    update: updateUserProperties,
  },
  [ModelName.PushSubscriptions]: {
    modelName: ModelName.PushSubscriptions,
    add: addSubscription,
    remove: removeSubscription,
    update: updateSubscription,
  },
  [ModelName.EmailSubscriptions]: {
    modelName: ModelName.EmailSubscriptions,
    add: addSubscription,
    remove: removeSubscription,
    update: updateSubscription,
  },
  [ModelName.SmsSubscriptions]: {
    modelName: ModelName.SmsSubscriptions,
    add: addSubscription,
    remove: removeSubscription,
    update: updateSubscription,
  }
};
