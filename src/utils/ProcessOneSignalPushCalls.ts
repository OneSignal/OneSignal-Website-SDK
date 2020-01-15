import OneSignalError from "../errors/OneSignalError";

export class ProcessOneSignalPushCalls {
  public static processItem(oneSignalInstance: IOneSignal, item: Function | object[] | object) {
    if (typeof(item) === "function")
      item();
    else if (Array.isArray(item)) {
      if (item.length == 0)
        throw new OneSignalError("Empty array is not valid!");

      const functionName = item.shift();
      if (functionName == null || typeof(functionName) === "undefined")
        throw new OneSignalError("First element in array must be the OneSignal function name");

      const oneSignalFunction = oneSignalInstance[functionName.toString()];
      if (typeof(oneSignalFunction) !== "function")
        throw new OneSignalError(`No OneSignal function with the name '${functionName}'`);
      oneSignalFunction.apply(oneSignalInstance, item);
    }
    else
      throw new OneSignalError("Only accepts function and Array types!");
  }
}
