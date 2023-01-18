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

const RETRY_BACKOFF: { [key: number]: number } = {
  5: 10_000,
  4: 20_000,
  3: 30_000,
  2: 30_000,
  1: 30_000,
};

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

  static async upsertUser(userData: Partial<UserData>, retry: number = 5): Promise<UserData> {
    logMethodCall("LoginManager.upsertUser", { userData });

    if (retry === 0) {
      throw new OneSignalError("Login: upsertUser failed: max retries reached");
    }

    const appId = await MainHelper.getAppId();
    const userDataCopy = JSON.parse(JSON.stringify(userData));

    // only accepts one alias, so remove other aliases only leaving external_id
    this.stripAliasesOtherThanExternalId(userData);

    const response = await RequestService.createUser({ appId }, userData);
    const result = response?.result;
    const status = response?.status;

    if (status >= 200 && status < 300) {
      Log.info("Successfully created user", result);
    } else if (status >= 400 && status < 500) {
      Log.error("Malformed request", result);
    } else if (status >= 500) {
      Log.error("Server error. Retrying...");
      await awaitableTimeout(RETRY_BACKOFF[retry]);
      return this.upsertUser(userDataCopy, retry - 1);
    }

    return result;
  }

  static async identifyUser(userData: UserData, pushSubscriptionId?: string, retry: number = 5):
    Promise<Partial<UserData>> {
      logMethodCall("LoginManager.identifyUser", { userData, pushSubscriptionId });

      if (retry === 0) {
        throw new OneSignalError("Login: identifyUser failed: max retries reached");
      }

      const { onesignal_id: onesignalId } = userData.identity;
      const userDataCopy = JSON.parse(JSON.stringify(userData));

      // only accepts one alias, so remove other aliases only leaving external_id
      this.stripAliasesOtherThanExternalId(userData);

      const { identity } = userData;

      if (!identity || !onesignalId) {
        throw new OneSignalError("identifyUser failed: no identity found");
      }

      const appId = await MainHelper.getAppId();
      const aliasPair = new AliasPair(AliasPair.ONESIGNAL_ID, onesignalId);

      // identify user
      const identifyUserResponse = await RequestService.addAlias({ appId }, aliasPair, identity);
      const identifyResponseStatus = identifyUserResponse?.status;

      if (identifyResponseStatus >= 200 && identifyResponseStatus < 300) {
        Log.info("identifyUser succeeded");
      } else if (identifyResponseStatus === 409 && pushSubscriptionId) {
        return await this.transferSubscription(appId, pushSubscriptionId, identity);
      } else if (identifyResponseStatus >= 400 && identifyResponseStatus < 500) {
        throw new OneSignalError(`identifyUser: malformed request: ${JSON.stringify(identifyUserResponse?.result)}`);
      } else if (identifyResponseStatus >= 500) {
        Log.error("identifyUser failed: server error. Retrying...");
        await awaitableTimeout(RETRY_BACKOFF[retry]);
        return this.identifyUser(userDataCopy, pushSubscriptionId, retry - 1);
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
}
