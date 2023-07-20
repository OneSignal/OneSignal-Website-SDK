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
import { RETRY_BACKOFF } from "../../shared/api/RetryBackoff";
import { isCompleteSubscriptionObject } from "../../core/utils/typePredicates";
import UserDirector from "../../onesignal/UserDirector";
import Database from "../../shared/services/Database";
import LocalStorage from "../../shared/utils/LocalStorage";
import { ModelName, SupportedModel } from "../../core/models/SupportedModels";

export default class LoginManager {
  static async login(externalId: string, token?: string): Promise<void> {
    const consentRequired = LocalStorage.getConsentRequired();
    const consentGiven = await Database.getConsentGiven();

    if (consentRequired && !consentGiven) {
      throw new OneSignalError('Login: Consent required but not given, skipping login');
    }

    try {
      // before, logging in, process anything waiting in the delta queue so it's not lost
      OneSignal.coreDirector.forceDeltaQueueProcessingOnAllExecutors();

      if (token) {
        await Database.setJWTToken(token);
      }

      const identityModel = OneSignal.coreDirector.getIdentityModel();
      const onesignalIdBackup = identityModel?.onesignalId;

      if (!identityModel) {
        throw new OneSignalError('Login: No identity model found');
      }

      const currentExternalId = identityModel?.data?.external_id;

      // if the current externalId is the same as the one we're trying to set, do nothing
      if (currentExternalId === externalId) {
        Log.debug('Login: External ID already set, skipping login');
        return;
      }

      const pushSubModel = await OneSignal.coreDirector.getCurrentPushSubscriptionModel();
      let currentPushSubscriptionId;

      if (pushSubModel && isCompleteSubscriptionObject(pushSubModel.data)) {
        currentPushSubscriptionId = pushSubModel.data.id;
      }

      const isIdentified = LoginManager.isIdentified(identityModel.data);

      // set the external id on the user locally
      LoginManager.setExternalId(identityModel, externalId);

      let userData: Partial<UserData>;
      if (!isIdentified) {
        // Guest User -> Logged In User
        //    If login was not called before we want to keep all data from the "Guest User".
        userData = await UserDirector.getAllUserData();
      } else {
        // Stripping all other Aliases, The REST API POST /users API only allows one. (as of 2023/07/19)
        userData = {
          identity: {
            external_id: externalId,
          }
        };

        const pushSubscription = await OneSignal.coreDirector.getCurrentPushSubscriptionModel();
        if (pushSubscription) {
          userData.subscriptions = [pushSubscription.data];
        }
        // We don't want to carry over tags and other properties from the current User if we are switching Users.
        //   - Example switching from User A to User B.
      }
      await OneSignal.coreDirector.resetModelRepoAndCache();
      await UserDirector.initializeUser(true);

      // use optional chaining to prevent errors if the namespace is not initialized (e.g. in unit tests)
      await OneSignal.User?.PushSubscription?._resubscribeToPushModelChanges();

      try {
        const result = await LoginManager.identifyOrUpsertUser(userData, isIdentified, currentPushSubscriptionId);
        const onesignalId = result?.identity?.onesignal_id;

        if (!onesignalId) {
          Log.info("Caching login call, waiting on network or subscription creation.");
          return;
        }
        await LoginManager.fetchAndHydrate(onesignalId);
      } catch (e) {
        Log.error(`Login: Error while identifying/upserting user: ${e.message}`);
        // if the login fails, restore the old user data
        if (onesignalIdBackup) {
          Log.debug('Login: Restoring old user data');

          try {
            await LoginManager.fetchAndHydrate(onesignalIdBackup);
          } catch (e) {
            Log.error(`Login: Error while restoring old user data: ${e.message}`);
          }
        }
        throw e;
      }
    } catch (e) {
      Log.error(e);
    }
  }

  static async logout(): Promise<void> {
    // check if user is already logged out
    const identityModel = OneSignal.coreDirector.getIdentityModel();
    if (!identityModel || !identityModel.data || !identityModel.data.external_id) {
      Log.debug('Logout: User is not logged in, skipping logout');
      return;
    }

    // before, logging out, process anything waiting in the delta queue so it's not lost
    OneSignal.coreDirector.forceDeltaQueueProcessingOnAllExecutors();
    UserDirector.resetUserMetaProperties();
    const pushSubModel = await OneSignal.coreDirector.getCurrentPushSubscriptionModel();
    await OneSignal.coreDirector.resetModelRepoAndCache();
    // add the push subscription model back to the repo since we need at least 1 sub to create a new user
    OneSignal.coreDirector.add(ModelName.PushSubscriptions, pushSubModel as OSModel<SupportedModel>, false);
    await UserDirector.initializeUser(false);
    await OneSignal.User.PushSubscription._resubscribeToPushModelChanges();
  }

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

  static async upsertUser(userData: Partial<UserData>, retry = 5): Promise<UserData> {
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

  static async identifyUser(userData: UserData, pushSubscriptionId?: string, retry = 5):
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


      if (!identity) {
        throw new OneSignalError("identifyUser failed: no identity found");
      }

      if (!onesignalId) {
        // Persist to disk so it is used once we have the opportunity to create a User.
        const identityModel = OneSignal.coreDirector.getIdentityModel();
        identityModel?.set(AliasPair.EXTERNAL_ID, identity.external_id, false);
        return userData;
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
    logMethodCall("LoginManager.stripAliasesOtherThanExternalId", { userData });

    const { identity } = userData;
    if (!identity) {
      throw new OneSignalError("stripAliasesOtherThanExternalId failed: no identity found");
    }

    const { external_id } = identity;
    if (!external_id) {
      throw new OneSignalError("stripAliasesOtherThanExternalId failed: no external_id found");
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
