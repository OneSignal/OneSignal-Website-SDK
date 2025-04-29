import { ICreateUser, IUserIdentity, UserData } from 'src/core/types/api';
import { RequestService } from '../core/requestService/RequestService';
import { isCompleteSubscriptionObject } from '../core/utils/typePredicates';
import Environment from '../shared/helpers/Environment';
import MainHelper from '../shared/helpers/MainHelper';
import Log from '../shared/libraries/Log';
import { logMethodCall } from '../shared/utils/utils';
import User from './User';

export default class UserDirector {
  static async initializeUser(isTemporary?: boolean): Promise<void> {
    logMethodCall('initializeUser', { isTemporary });

    const existingIdentity = OneSignal.coreDirector.getIdentityModel();
    const existingProperties = OneSignal.coreDirector.getPropertiesModel();
    const existingUser = !!existingIdentity && !!existingProperties;

    if (existingUser) {
      Log.debug('User already exists, skipping initialization.');
      return;
    }

    UserDirector.createUserPropertiesModel();
    await UserDirector.createAnonymousUser(isTemporary);
  }

  static resetUserMetaProperties() {
    const user = User.createOrGetInstance();
    user.hasOneSignalId = false;
    user.isCreatingUser = false;
  }

  static async createAnonymousUser(isTemporary?: boolean): Promise<void> {
    let identity: IUserIdentity | Record<string, never>;

    if (isTemporary) {
      identity = {};
    } else {
      const userData = await UserDirector.createUserOnServer();

      if (userData) {
        identity = userData.identity;
        OneSignal.coreDirector.hydrateUser(userData);
      } else {
        return;
      }
    }

    const identityModel = OneSignal.coreDirector.getIdentityModel();
    identityModel.mergeData(identity);

    const user = User.createOrGetInstance();
    if (identity.onesignalId) {
      user.hasOneSignalId = true;
      user.onesignalId = identity.onesignalId;
    }
  }

  static createUserPropertiesModel() {
    const properties = {
      language: Environment.getLanguage(),
      timezone_id: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    const propertiesModel = OneSignal.coreDirector.getPropertiesModel();
    propertiesModel.mergeData(properties);

    return propertiesModel;
  }

  static async createUserOnServer(): Promise<UserData | void> {
    const user = User.createOrGetInstance();

    if (user.isCreatingUser) {
      return;
    }

    user.isCreatingUser = true;

    try {
      const appId = await MainHelper.getAppId();
      const pushSubscription =
        await OneSignal.coreDirector.getPushSubscriptionModel();

      let subscriptionId;
      if (isCompleteSubscriptionObject(pushSubscription)) {
        subscriptionId = pushSubscription?.id;
      }

      const userData = await UserDirector.getAllUserData();
      const response = await RequestService.createUser(
        { appId, subscriptionId },
        userData,
      );
      user.isCreatingUser = false;
      const status = response.status;
      const result = response.result as UserData;

      if (status >= 200 && status < 300) {
        const onesignalId = userData.identity?.onesignal_id;

        if (onesignalId) {
          OneSignal.coreDirector.getNewRecordsState()?.add(onesignalId);
        }

        const payloadSubcriptionToken = userData.subscriptions?.[0]?.token;
        const resultSubscription = result.subscriptions?.find(
          (sub) => sub.token === payloadSubcriptionToken,
        );

        if (resultSubscription) {
          if (isCompleteSubscriptionObject(resultSubscription)) {
            OneSignal.coreDirector
              .getNewRecordsState()
              .add(resultSubscription.id);
          }
        }
      }
      return result;
    } catch (e) {
      Log.error(e);
    }
  }

  static async createAndHydrateUser(): Promise<void> {
    const userData = await UserDirector.createUserOnServer();
    if (userData) {
      OneSignal.coreDirector.hydrateUser(userData);
    }
  }

  static async getAllUserData(): Promise<ICreateUser> {
    logMethodCall('LoginManager.getAllUserData');

    const identity = OneSignal.coreDirector.getIdentityModel();
    const properties = OneSignal.coreDirector.getPropertiesModel();
    const subscriptions =
      await OneSignal.coreDirector.getAllSubscriptionsModels();

    const userData: ICreateUser = {
      identity: identity.toJSON(),
      properties: properties.toJSON(),
      subscriptions: subscriptions?.map((subscription) =>
        subscription.toJSON(),
      ),
    };

    return userData;
  }
}
