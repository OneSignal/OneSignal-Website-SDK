import OneSignalError from "../../shared/errors/OneSignalError";
import { logMethodCall } from "../../shared/utils/utils";
import OneSignal from "../../onesignal/OneSignal";
import UserData from "../../core/models/UserData";
import { RequestService } from "../../core/requestService/RequestService";
import AliasPair from "../../core/requestService/AliasPair";
import Log from "../../shared/libraries/Log";
import { OSModel } from "../../core/modelRepo/OSModel";
import { SupportedIdentity } from "../../core/models/IdentityModel";

export default class LoginManager {
  static setExternalId(identityOSModel: OSModel<SupportedIdentity>, externalId: string): void {
    logMethodCall("LoginManager.setExternalId", { externalId });

    if (!identityOSModel) {
      throw new OneSignalError('login: no identity model found');
    }

    identityOSModel.set('externalId', externalId, false);
  }

  static isIdentified(identity: SupportedIdentity): boolean {
    logMethodCall("LoginManager.isIdentified");

    return identity.externalId !== undefined;
  }

  static async getAllUserData(): Promise<UserData> {
    logMethodCall("LoginManager.getAllUserModels");

    const identity = await OneSignal.coreDirector.getIdentityModel();
    const properties = await OneSignal.coreDirector.getPropertiesModel();
    const subscriptions = await OneSignal.coreDirector.getAllSubscriptionsModels();

    const userData: Partial<UserData> = {};
    userData.identity = identity?.data;
    userData.properties = properties?.data;
    userData.subscriptions = subscriptions?.map(subscription => subscription.data);

    return userData as UserData;
  }

  static async upsertUser(userData: UserData): Promise<UserData> {
    logMethodCall("LoginManager.upsertUser", { userData });
    const response = await RequestService.createUser(userData);
    const result = response?.result;
    const status = response?.status;

    if (status && status >= 200 && status < 300) {
      Log.info("Successfully created user", result);
    } else {
      Log.error("Error creating user", result);
    }

    return result;
  }

  static async identifyUser(userData: UserData, pushSubscriptionId?: string): Promise<Partial<UserData>> {
    logMethodCall("LoginManager.identifyUser", { userData, pushSubscriptionId });

    const { identity } = userData;
    const { externalId } = identity;

    if (!identity || !externalId) {
      throw new OneSignalError("identifyUser failed: no identity found");
    }

    const aliasPair = new AliasPair("externalId", externalId);
    const identifyUserResponse = await RequestService.identifyUser(aliasPair, identity);

    const identifyResponseStatus = identifyUserResponse?.status;
    if (identifyResponseStatus && identifyResponseStatus >= 200 && identifyResponseStatus < 300) {
      Log.info("identifyUser succeeded");
    } else if (identifyResponseStatus === 409 && pushSubscriptionId) {
      Log.info(`identifyUser failed: externalId already exists. Attempting to transfer push subscription...`);

      const retainPreviousOwner = false;
      const transferResponse = await RequestService.transferSubscription(
        pushSubscriptionId,
        identity,
        retainPreviousOwner
      );
      const transferResponseStatus = transferResponse?.status;

      if (transferResponseStatus && transferResponseStatus >= 200 && transferResponseStatus < 300) {
        Log.info("transferSubscription succeeded");
      } else {
        Log.warn("transferSubscription failed");
      }
    }

    // TO DO: if 409s, we may include an error in the result and not just the identity object of existing owner of alias
    // so we need to make sure to get the identity object from the result correctly
    const identityResult = identifyUserResponse?.result;
    return { identity: identityResult };
  }

  static async identifyOrUpsertUser(userData: UserData, isIdentified: boolean, subscriptionId?: string)
    : Promise<Partial<UserData>> {
    logMethodCall("LoginManager.identifyOrUpsertUser", { userData, isIdentified, subscriptionId });

      let result: Partial<UserData>;

      if (isIdentified) {
        // if started off identified, create a new user
        result = await LoginManager.upsertUser(userData);
      } else {
        // promoting anonymous user to identified user
        result = await LoginManager.identifyUser(userData, subscriptionId);
      }
      return result;
  }

  static async fetchAndHydrate(onesignalId: string): Promise<void> {
    logMethodCall("LoginManager.fetchAndHydrate", { onesignalId });

    /* TO DO: uncomment
    const fetchUserResponse = await RequestService.getUser(
      new AliasPair("onesignalId", onesignalId)
    );
    */
    const fetchUserResponse = {
      result: {
        identity: {
          onesignalId,
          externalId: "99999",
        },
        properties: {
          tags: {
            tag1: "tag1",
          },
        },
        subscriptions: [],
      },
    };

    await OneSignal.coreDirector.hydrateUser(fetchUserResponse?.result).catch(e => {
      Log.error("Error hydrating user models", e);
    });
  }
}
