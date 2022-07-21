
import OneSignal from "../../OneSignal";
import Subscribable from "../Subscribable";
import { EnhancedSet } from "../EnhancedSet";

export default class OperationRepo extends Subscribable<Operation> {
  private operationQueue: EnhancedSet<Operation> = new EnhancedSet();
  constructor(private oneSignal: OneSignal) {
    super();
  }
}