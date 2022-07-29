import ModelRepo from "./ModelRepo";
import OperationRepo from "./OperationRepo";
import { ConfigModel, IdentityModel, Model, UserProperties, SessionModel, SubscriptionsModel } from "./types";

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
    this.modelRepo.set<IdentityModel>(Model.Identity, res);
  }

  private hydrateProperties(res: ServerResponse): void {
    this.modelRepo.set<UserProperties>(Model.Properties, res);
  }

  private hydrateSession(res: ServerResponse): void {
    this.modelRepo.set<SessionModel>(Model.Session, res);
  }

  private hydrateConfig(res: ServerResponse): void {
    this.modelRepo.set<ConfigModel>(Model.Config, res);
  }

  private hydrateSubscriptions(res: ServerResponse): void {
    this.modelRepo.set<SubscriptionsModel>(Model.Subscriptions, res);
  }
}
