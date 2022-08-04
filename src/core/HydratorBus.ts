import { SubscriptionsCollection } from "../onesignal/subscriptions/SubscriptionsCollection";
import { AppConfig } from "../shared/models/AppConfig";
import ModelRepo from "./ModelRepo";
import OperationRepo from "./OperationRepo";
import { IdentityModel, Model, UserProperties } from "./types";

type ServerResponse = object;

export class HydratorBus {
  constructor(private modelRepo: ModelRepo, private operationRepo: OperationRepo) {
    this.operationRepo.subscribe((res: ServerResponse) => {
      this.hydrate(res);
    });
  }

  private hydrate(res: ServerResponse): void {
    console.log("hydrating:", res);
  }

  private hydrateIdentity(res: ServerResponse): void {
    this.modelRepo.set<IdentityModel>(Model.Identity, res, true);
  }

  private hydrateProperties(res: ServerResponse): void {
    this.modelRepo.set<UserProperties>(Model.Properties, res, true);
  }

  private hydrateConfig(res: ServerResponse): void {
    this.modelRepo.set<AppConfig>(Model.Config, res, true);
  }

  private hydrateSubscriptions(res: ServerResponse): void {
    this.modelRepo.set<SubscriptionsCollection>(Model.Subscriptions, res, true);
  }
}
