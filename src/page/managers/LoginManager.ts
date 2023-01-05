import OneSignalError from "../../shared/errors/OneSignalError";
import { logMethodCall } from "../../shared/utils/utils";
import OneSignal from "../../onesignal/OneSignal";
import UserData from "../../core/models/UserData";
import { RequestService } from "../../core/requestService/RequestService";
import AliasPair from "../../core/requestService/AliasPair";
import Log from "../../shared/libraries/Log";
import { OSModel } from "../../core/modelRepo/OSModel";
import { SupportedIdentity } from "../../core/models/IdentityModel";
import MainHelper from "../../shared/helpers/MainHelper";

export default class LoginManager {
  static setExternalId(identityOSModel: OSModel<SupportedIdentity>, externalId: string): void {
    logMethodCall("LoginManager.setExternalId", { externalId });

    if (!identityOSModel) {
      throw new OneSignalError('login: no identity model found');
    }

    identityOSModel.set('external_id', externalId, false);
  }

  static isIdentified(identity: SupportedIdentity): boolean {
    logMethodCall("LoginManager.isIdentified", { identity });

    return identity.external_id !== undefined;
  }

  static async upsertUser(userData: UserData): Promise<UserData> {
    logMethodCall("LoginManager.upsertUser", { userData });
    const appId = await MainHelper.getAppId();
    this.prepareIdentityForUpsert(userData);
    const response = await RequestService.createUser({ appId }, userData);
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

    const { onesignal_id: onesignalId } = userData.identity;

    // only accepts one alias, so remove other aliases only leaving external_id
    this.prepareIdentityForUpsert(userData);
    let { identity } = userData;

    if (!identity || !onesignalId) {
      throw new OneSignalError("identifyUser failed: no identity found");
    }

    const appId = await MainHelper.getAppId();
    const aliasPair = new AliasPair(AliasPair.ONESIGNAL_ID, onesignalId);
    const identifyUserResponse = await RequestService.addAlias({ appId }, aliasPair, identity);

    const identifyResponseStatus = identifyUserResponse?.status;
    if (identifyResponseStatus && identifyResponseStatus >= 200 && identifyResponseStatus < 300) {
      Log.info("identifyUser succeeded");
    } else if (identifyResponseStatus === 409 && pushSubscriptionId) {
      Log.info(`identifyUser failed: externalId already exists. Attempting to transfer push subscription...`);

      const retainPreviousOwner = false;
      identity = userData.identity;
      const transferResponse = await RequestService.transferSubscription(
        { appId },
        pushSubscriptionId,
        identity,
        retainPreviousOwner
      );
      const transferResponseStatus = transferResponse?.status;
      const tansferResult = transferResponse?.result;

      if (transferResponseStatus && transferResponseStatus >= 200 && transferResponseStatus < 300) {
        Log.info("transferSubscription succeeded");
        const transferResultIdentity = tansferResult?.identity;
        return { identity: transferResultIdentity };
      } else {
        throw new OneSignalError(`transferSubscription failed: ${JSON.stringify(tansferResult)}}`);
      }
    }

    const identityResult = identifyUserResponse?.result?.identity;
    return { identity: identityResult };
  }

  static async identifyOrUpsertUser(userData: UserData, isIdentified: boolean, subscriptionId?: string)
    : Promise<Partial<UserData>> {
    logMethodCall("LoginManager.identifyOrUpsertUser", { userData, isIdentified, subscriptionId });

      let result: Partial<UserData>;

      if (isIdentified) {
        // if started off identified, create a new user
        result = await this.upsertUser(userData);
      } else {
        // promoting anonymous user to identified user
        result = await this.identifyUser(userData, subscriptionId);
      }
      return result;
  }

  static async fetchAndHydrate(onesignalId: string): Promise<void> {
    logMethodCall("LoginManager.fetchAndHydrate", { onesignalId });

    const fetchUserResponse = await RequestService.getUser(
      { appId: await MainHelper.getAppId() },
      new AliasPair(AliasPair.ONESIGNAL_ID, onesignalId)
    );

    await OneSignal.coreDirector.hydrateUser(fetchUserResponse?.result).catch(e => {
      Log.error("Error hydrating user models", e);
    });
  }

  /**
   * identity object should only contain external_id
   * if logging in from identified user a to identified user b, the identity object would
   * otherwise contain any existing user a aliases
   */
  static prepareIdentityForUpsert(userData: UserData): void {
    logMethodCall("LoginManager.prepareIdentityForUpsert", { userData });

    const { identity } = userData;
    if (!identity) {
      throw new OneSignalError("prepareIdentityForUpsert failed: no identity found");
    }

    const { external_id } = identity;
    if (!external_id) {
      throw new OneSignalError("prepareIdentityForUpsert failed: no external_id found");
    }

    const newIdentity = { external_id };
    userData.identity = newIdentity;
  }
}
