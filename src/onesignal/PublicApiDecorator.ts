import Log from "../shared/libraries/Log";

export function PublicApi() {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Log.info(`Called @PublicApi function: OneSignal.${propertyKey}`);
  };
}
