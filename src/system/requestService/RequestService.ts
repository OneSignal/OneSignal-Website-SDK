import { Model, Operation, Request, RequestArgs } from "../types";
import Subscribable from '../Subscribable';
import OneSignal from '../../OneSignal';
import { ConfigHydrator } from "../hydrators/ConfigHydrator";
import { IdentityHydrator } from "../hydrators/IdentityHydrator";
import { PropertiesHydrator } from "../hydrators/PropertiesHydrator";
import { SubscriptionsHydrator } from "../hydrators/SubscriptionsHydrator";

export default class RequestService extends Subscribable<Operation> {
  public configHydrator: ConfigHydrator;
  public identityHydrator: IdentityHydrator;
  public propertiesHydrator: PropertiesHydrator;
  public subscriptionsHydrator: SubscriptionsHydrator;

  constructor(private oneSignal: OneSignal) {
    super();
    this.configHydrator = new ConfigHydrator();
    this.identityHydrator = new IdentityHydrator();
    this.propertiesHydrator = new PropertiesHydrator();
    this.subscriptionsHydrator = new SubscriptionsHydrator();
  }

  public setup(): void {
    this.oneSignal.system.operationRepo.subscribe(async (operation: Operation) => {
      await this.processOperation(operation);
    });
  }

  private async processOperation(operation: Operation): Promise<void> {
    // TO DO
    // GENERATE REQUEST
    // SEND REQUEST


    const res = this.request({
      httpMethod: "POST",
      operation: operation,
      user: null
    });

    if (!!res) {
      operation.success = true;
      this.broadcast(operation);
    }
  }

  private async request(req: Request): Promise<boolean> {
    console.log("making request:", req);

    /*
    const { action, data, headers } = this.hydrateRequest(req);
    let res;

    switch (req.httpMethod) {
      case "POST":
        res = await OneSignalApiBase.post(action, data, headers); // TO DO: fix api base return type
        break;
      case "GET":
        // res = await OneSignalApiBase.get(action, data, headers);
        break;
      case "PUT":
        // res = await OneSignalApiBase.put(action, data, headers);
        break;
      case "DELETE":
        // res = await OneSignalApiBase.delete(action, data, headers);
        break;
      default:
        break;
    }

    // if (res.error) {
    //   // retry logic
    // }

    await this.hydrateModel(req.operation.model, res);

    */
    return true; //success
  }

  private hydrateRequest(req: Request): RequestArgs {
    // TO DO
    return {
      action: "user",
      data: {}
    };
  }

  private async hydrateModel(model: Model, res: any): Promise<void> {
    const shouldUpdate = true; // TO DO
    if (shouldUpdate) {
      switch (model) {
        case Model.Config:
          this.configHydrator.hydrate(res);
          break;
        case Model.Identity:
          this.identityHydrator.hydrate(res);
          break;
        case Model.Properties:
          this.propertiesHydrator.hydrate(res);
          break;
        case Model.Subscriptions:
          this.subscriptionsHydrator.hydrate(res);
          break;
        default:
          break;
      }
    }
  }
}