import Environment from "../shared/helpers/Environment";
import { OSModel } from "../core/modelRepo/OSModel";
import { IdentityModel, SupportedIdentity } from "../core/models/IdentityModel";
import { SupportedSubscription } from "../core/models/SubscriptionModels";
import { ModelName, SupportedModel } from "../core/models/SupportedModels";
import { UserPropertiesModel } from "../core/models/UserPropertiesModel";
import OneSignal from "./OneSignal";
import Log from "../shared/libraries/Log";
import { RequestService } from "../core/requestService/RequestService";
import UserData from "../core/models/UserData";
import MainHelper from "../shared/helpers/MainHelper";
import { isIdentityObject } from "../core/utils/typePredicates";
import OneSignalError from "../shared/errors/OneSignalError";

export default class User {
  hasOneSignalId: boolean = false;
  onesignalId?: string;
  awaitOneSignalIdAvailable?: Promise<string>;
  isCreatingUser: boolean = false;

  static singletonInstance?: User = undefined;

  /**
   * Creates a user singleton
   * @returns - User singleton
   */
  static createOrGetInstance(): User {
    if (!User.singletonInstance) {
      User.singletonInstance = new User();
      UserDirector.initializeUser(true)
        .then(() => {
          UserDirector.copyOneSignalIdPromiseFromIdentityModel()
            .catch((e: Error) => {
              console.error(e);
            });
        })
        .catch((e: Error) => {
          console.error(e);
        });
    }

    return User.singletonInstance;
  }
}