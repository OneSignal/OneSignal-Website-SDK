import { IdentityModel } from 'src/core/models/IdentityModel';
import { ICreateUser, IUserIdentity, UserData } from 'src/core/types/api';
import AliasPair from '../../core/requestService/AliasPair';
import { RequestService } from '../../core/requestService/RequestService';
import { isCompleteSubscriptionObject } from '../../core/utils/typePredicates';
import OneSignal from '../../onesignal/OneSignal';
import UserDirector from '../../onesignal/UserDirector';
import { RETRY_BACKOFF } from '../../shared/api/RetryBackoff';
import OneSignalError from '../../shared/errors/OneSignalError';
import MainHelper from '../../shared/helpers/MainHelper';
import Log from '../../shared/libraries/Log';
import Database from '../../shared/services/Database';
import { awaitableTimeout } from '../../shared/utils/AwaitableTimeout';
import LocalStorage from '../../shared/utils/LocalStorage';
import { logMethodCall } from '../../shared/utils/utils';

export default class LoginManager {
  // Other internal classes should await on this if they access users
  static switchingUsersPromise: Promise<void> = Promise.resolve();

  static async login(externalId: string, token?: string): Promise<void> {
    await (this.switchingUsersPromise = LoginManager._login(externalId, token));
  }

  private static async _login(
    externalId: string,
    token?: string,
  ): Promise<void> {
    const consentRequired = LocalStorage.getConsentRequired();
    const consentGiven = await Database.getConsentGiven();

    if (consentRequired && !consentGiven) {
      throw new OneSignalError(
        'Login: Consent required but not given, skipping login',
      );
    }

    try {
      if (token) {
        await Database.setJWTToken(token);
      }

      const identityModel = OneSignal.coreDirector.getIdentityModel();
      const onesignalIdBackup = identityModel?.onesignalId;

      if (!identityModel) {
        throw new OneSignalError('Login: No identity model found');
      }

      const currentExternalId = identityModel.externalId;

      // if the current externalId is the same as the one we're trying to set, do nothing
      if (currentExternalId === externalId) {
        Log.debug('Login: External ID already set, skipping login');
        return;
      }

      const pushSubModel =
        await OneSignal.coreDirector.getPushSubscriptionModel();
      let currentPushSubscriptionId;

      if (isCompleteSubscriptionObject(pushSubModel)) {
        currentPushSubscriptionId = pushSubModel.id;
      }

      const isIdentified = LoginManager.isIdentified({
        external_id: identityModel.externalId,
      });

      // set the external id on the user locally
      LoginManager.setExternalId(identityModel, externalId);

      let userData: ICreateUser;
      if (!isIdentified) {
        // Guest User -> Logged In User
        //    If login was not called before we want to keep all data from the "Guest User".
        userData = await UserDirector.getAllUserData();
      } else {
        // Stripping all other Aliases, The REST API POST /users API only allows one. (as of 2023/07/19)
        userData = {
          identity: {
            external_id: externalId,
          },
        };

        const pushSubscription =
          await OneSignal.coreDirector.getPushSubscriptionModel();
        if (pushSubscription) {
          userData.subscriptions = [pushSubscription.toJSON()];
        }
        // We don't want to carry over tags and other properties from the current User if we are switching Users.
        //   - Example switching from User A to User B.
      }
      await UserDirector.initializeUser();

      try {
        const result = await LoginManager.identifyOrUpsertUser(
          userData,
          isIdentified,
          currentPushSubscriptionId,
        );
        const onesignalId = result?.identity?.onesignal_id;

        if (!onesignalId) {
          Log.info(
            'Caching login call, waiting on network or subscription creation.',
          );
          return;
        }
        // hydrating with local externalId as server could still be updating
        await LoginManager.fetchAndHydrate(onesignalId, externalId);
      } catch (e) {
        if (e instanceof Error) {
          Log.error(
            `Login: Error while identifying/upserting user: ${e.message}`,
          );
        }

        // if the login fails, restore the old user data
        if (onesignalIdBackup) {
          Log.debug('Login: Restoring old user data');

          try {
            await LoginManager.fetchAndHydrate(
              onesignalIdBackup,
              currentExternalId,
            );
          } catch (e) {
            if (e instanceof Error) {
              Log.error(
                `Login: Error while restoring old user data: ${e.message}`,
              );
            }
          }
        }
        throw e;
      }
    } catch (e) {
      Log.error(e);
    }
  }

  static async logout(): Promise<void> {
    await (this.switchingUsersPromise = LoginManager._logout());
  }

  private static async _logout(): Promise<void> {
    // check if user is already logged out
    const identityModel = OneSignal.coreDirector.getIdentityModel();

    if (!identityModel.externalId) {
      Log.debug('Logout: User is not logged in, skipping logout');
      return;
    }

    // before, logging out, process anything waiting in the delta queue so it's not lost
    UserDirector.resetUserMetaProperties();
    const pushSubModel =
      await OneSignal.coreDirector.getPushSubscriptionModel();

    // Initialize as a local User, as we don't have a push subscription to create a remote anonymous user.
    if (pushSubModel === undefined) {
      await UserDirector.initializeUser();
      return;
    }

    // add the push subscription model back to the repo since we need at least 1 sub to create a new user
    OneSignal.coreDirector.addSubscriptionModel(pushSubModel);

    // Initialize as non-local, make a request to OneSignal to create a new anonymous user
    await UserDirector.initializeUser();
  }

  static setExternalId(identityModel: IdentityModel, externalId: string): void {
    logMethodCall('LoginManager.setExternalId', { externalId });
    identityModel.externalId = externalId;
  }

  static isIdentified(identity: { external_id?: string }): boolean {
    logMethodCall('LoginManager.isIdentified', { identity });

    return identity.external_id !== undefined;
  }

  static async identifyOrUpsertUser(
    userData: ICreateUser,
    isIdentified: boolean,
    subscriptionId?: string,
  ): Promise<ICreateUser> {
    logMethodCall('LoginManager.identifyOrUpsertUser', {
      userData,
      isIdentified,
      subscriptionId,
    });
    let result: ICreateUser;

    if (isIdentified) {
      // if started off identified, upsert a user
      result = await this.upsertUser(userData, subscriptionId);
    } else {
      // promoting anonymous user to identified user
      // from user data, we only use identity (and we remove all aliases except external_id)
      result = await this.identifyUser(userData as UserData, subscriptionId);
    }
    return result;
  }

  static async upsertUser(
    userData: ICreateUser,
    subscriptionId?: string,
    retry = 5,
  ): Promise<UserData> {
    logMethodCall('LoginManager.upsertUser', { userData, subscriptionId });

    if (retry === 0) {
      throw new OneSignalError('Login: upsertUser failed: max retries reached');
    }

    const appId = await MainHelper.getAppId();
    const userDataCopy = JSON.parse(JSON.stringify(userData));

    // only accepts one alias, so remove other aliases only leaving external_id
    this.stripAliasesOtherThanExternalId(userData);

    const response = await RequestService.createUser(
      { appId, subscriptionId },
      userData,
    );
    const result = response?.result;
    const status = response?.status;

    if (status >= 200 && status < 300) {
      const onesignalId = userData.identity?.onesignal_id;

      const newRecordsState = OneSignal.coreDirector.getNewRecordsState();

      if (!newRecordsState) {
        Log.error(`UpsertUser: NewRecordsState is undefined`);
      }

      if (onesignalId) {
        newRecordsState?.add(onesignalId);
      }

      const payloadSubcriptionToken = userData.subscriptions?.[0]?.token;
      const resultSubscription = result.subscriptions?.find(
        (sub) => sub.token === payloadSubcriptionToken,
      );

      if (resultSubscription) {
        if (isCompleteSubscriptionObject(resultSubscription)) {
          newRecordsState?.add(resultSubscription.id);
        }
      }
      Log.info('Successfully created user', result);
    } else if (status >= 400 && status < 500) {
      Log.error('Malformed request', result);
    } else if (status >= 500) {
      Log.error('Server error. Retrying...');
      await awaitableTimeout(RETRY_BACKOFF[retry]);
      return this.upsertUser(userDataCopy, subscriptionId, retry - 1);
    }

    return result;
  }

  static async identifyUser(
    userData: UserData,
    pushSubscriptionId?: string,
    retry = 5,
  ): Promise<UserData> {
    logMethodCall('LoginManager.identifyUser', {
      userData,
      pushSubscriptionId,
    });

    if (retry === 0) {
      throw new OneSignalError(
        'Login: identifyUser failed: max retries reached',
      );
    }

    const { onesignal_id: onesignalId } = userData.identity;
    const userDataCopy = JSON.parse(JSON.stringify(userData));

    // only accepts one alias, so remove other aliases only leaving external_id
    this.stripAliasesOtherThanExternalId(userData);

    const { identity } = userData;

    if (!identity) {
      throw new OneSignalError('identifyUser failed: no identity found');
    }

    if (!onesignalId) {
      // Persist to disk so it is used once we have the opportunity to create a User.
      const identityModel = OneSignal.coreDirector.getIdentityModel();
      identityModel.externalId = identity.external_id;
      return userData;
    }

    const appId = await MainHelper.getAppId();
    const aliasPair = new AliasPair(AliasPair.ONESIGNAL_ID, onesignalId);

    // identify user
    const identifyUserResponse = await RequestService.addAlias(
      { appId },
      aliasPair,
      identity,
    );
    const identifyResponseStatus = identifyUserResponse?.status;

    if (identifyResponseStatus >= 200 && identifyResponseStatus < 300) {
      Log.info('identifyUser succeeded');

      const newRecordsState = OneSignal.coreDirector.getNewRecordsState();

      // External id takes time to update on server. Include as new record with current time
      newRecordsState.add(onesignalId);
    } else if (identifyResponseStatus === 409 && pushSubscriptionId) {
      return await this.transferSubscription(
        appId,
        pushSubscriptionId,
        identity,
      );
    } else if (identifyResponseStatus >= 400 && identifyResponseStatus < 500) {
      throw new OneSignalError(
        `identifyUser: malformed request: ${JSON.stringify(
          identifyUserResponse?.result,
        )}`,
      );
    } else if (identifyResponseStatus >= 500) {
      Log.error('identifyUser failed: server error. Retrying...');
      await awaitableTimeout(RETRY_BACKOFF[retry]);
      return this.identifyUser(userDataCopy, pushSubscriptionId, retry - 1);
    }

    const identityResult = identifyUserResponse?.result?.identity;
    return { identity: identityResult };
  }

  static async fetchAndHydrate(
    onesignalId: string,
    externalId?: string,
  ): Promise<void> {
    logMethodCall('LoginManager.fetchAndHydrate', { onesignalId, externalId });

    const fetchUserResponse = await RequestService.getUser(
      { appId: await MainHelper.getAppId() },
      new AliasPair(AliasPair.ONESIGNAL_ID, onesignalId),
    );

    OneSignal.coreDirector.hydrateUser(fetchUserResponse?.result, externalId);
  }

  /**
   * identity object should only contain external_id
   * if logging in from identified user a to identified user b, the identity object would
   * otherwise contain any existing user a aliases
   */
  static stripAliasesOtherThanExternalId(userData: ICreateUser): void {
    logMethodCall('LoginManager.stripAliasesOtherThanExternalId', { userData });

    const { identity } = userData;
    if (!identity) {
      throw new OneSignalError(
        'stripAliasesOtherThanExternalId failed: no identity found',
      );
    }

    const { external_id } = identity;
    if (!external_id) {
      throw new OneSignalError(
        'stripAliasesOtherThanExternalId failed: no external_id found',
      );
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
  static async transferSubscription(
    appId: string,
    pushSubscriptionId: string,
    identity: IUserIdentity,
  ): Promise<UserData> {
    Log.error(
      '^^^ Handling 409 HTTP response reported by the browser above.' +
        ' This is an expected result when the User already exists.' +
        ' Push subscription is being transferred the existing User.',
    );

    const retainPreviousOwner = false;
    const transferResponse = await RequestService.transferSubscription(
      { appId },
      pushSubscriptionId,
      identity,
      retainPreviousOwner,
    );
    const transferResponseStatus = transferResponse?.status;
    const transferResult = transferResponse?.result;

    if (
      transferResponseStatus &&
      transferResponseStatus >= 200 &&
      transferResponseStatus < 300
    ) {
      Log.info('transferSubscription succeeded');
      const transferResultIdentity = transferResult?.identity;
      return { identity: transferResultIdentity };
    } else {
      throw new OneSignalError(
        `transferSubscription failed: ${JSON.stringify(transferResult)}}`,
      );
    }
  }
}
