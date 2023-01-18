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
import { awaitableTimeout } from "../../shared/utils/AwaitableTimeout";

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

  static async upsertUser(userData: Partial<UserData>): Promise<UserData> {
    logMethodCall("LoginManager.upsertUser", { userData });
    const appId = await MainHelper.getAppId();
    this.stripAliasesOtherThanExternalId(userData);
    const response = await RequestService.createUser({ appId }, userData);
    const result = response?.result;
    const status = response?.status;

    if (status && status >= 200 && status < 300) {
      Log.info("Successfully created user", result);
    } else if (status && status >= 400 && status < 500) {
      Log.error("Malformed request", result);
    } else if (status && status >= 500) {
      // retry indefinitely
      Log.error("Server error. Retrying...");
      await awaitableTimeout(1000);
      return this.upsertUser(userData);
    }

    return result;
  }

  static async identifyUser(userData: UserData, pushSubscriptionId?: string): Promise<Partial<UserData>> {
    logMethodCall("LoginManager.identifyUser", { userData, pushSubscriptionId });

    const { onesignal_id: onesignalId } = userData.identity;

    // only accepts one alias, so remove other aliases only leaving external_id
    this.stripAliasesOtherThanExternalId(userData);
    const { identity } = userData;

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
      return await this.transferSubscription(appId, pushSubscriptionId, identity);
    } else if (identifyResponseStatus >= 400 && identifyResponseStatus < 500) {
      throw new OneSignalError(`identifyUser: malformed request: ${JSON.stringify(identifyUserResponse?.result)}`);
    } else if (identifyResponseStatus >= 500) {
      // retry indefinitely
      Log.error("identifyUser failed: server error. Retrying...");
      await awaitableTimeout(1000);
      return this.identifyUser(userData, pushSubscriptionId);
    }

    const identityResult = identifyUserResponse?.result?.identity;
    return { identity: identityResult };
  }

  static async identifyOrUpsertUser(userData: Partial<UserData>, isIdentified: boolean, subscriptionId?: string)
    : Promise<Partial<UserData>> {
      logMethodCall("LoginManager.identifyOrUpsertUser", { userData, isIdentified, subscriptionId });
      let result: Partial<UserData>;

      if (isIdentified) {
        // if started off identified, upsert a user
        result = await this.upsertUser(userData);
      } else {
        // promoting anonymous user to identified user
        // from user data, we only use identity (and we remove all aliases except external_id)
        result = await this.identifyUser(userData as UserData, subscriptionId);
      }
      return result;
  }

  static async fetchAndHydrate(onesignalId: string): Promise<void> {
    logMethodCall("LoginManager.fetchAndHydrate", { onesignalId });

    const fetchUserResponse = await RequestService.getUser(
      { appId: await MainHelper.getAppId() },
      new AliasPair(AliasPair.ONESIGNAL_ID, onesignalId)
    );

    OneSignal.coreDirector.hydrateUser(fetchUserResponse?.result);
  }

  /**
   * identity object should only contain external_id
   * if logging in from identified user a to identified user b, the identity object would
   * otherwise contain any existing user a aliases
   */
  static stripAliasesOtherThanExternalId(userData: Partial<UserData>): void {
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

  /**
   * Transfer subscription when identifyUser fails with 409
   * @param appId
   * @param pushSubscriptionId
   * @param identity
   * @returns Promise<Partial<UserData>>
   */
  static async transferSubscription(appId: string, pushSubscriptionId: string, identity: SupportedIdentity):
    Promise<Partial<UserData>> {
      Log.info(`identifyUser failed: externalId already exists. Attempting to transfer push subscription...`);

      const retainPreviousOwner = false;
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
}
