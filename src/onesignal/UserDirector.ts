import { OSModel } from '../core/modelRepo/OSModel';
import { SupportedIdentity } from '../core/models/IdentityModel';
import { ModelName, SupportedModel } from '../core/models/SupportedModels';
import UserData from '../core/models/UserData';
import Environment from '../shared/helpers/Environment';
import MainHelper from '../shared/helpers/MainHelper';
import Log from '../shared/libraries/Log';
import { logMethodCall } from '../shared/utils/utils';
import User from './User';
import { RequestService } from '../core/requestService/RequestService';
import { SupportedSubscription } from '../core/models/SubscriptionModels';
import { isCompleteSubscriptionObject } from '../core/utils/typePredicates';

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
    const identityOSModel = new OSModel<SupportedIdentity>(
      ModelName.Identity,
      {},
    );
    OneSignal.coreDirector.add(ModelName.Identity, identityOSModel, false);
    await this.copyOneSignalIdPromiseFromIdentityModel();
  }

  static resetUserMetaProperties() {
    const user = User.createOrGetInstance();
    user.hasOneSignalId = false;
    user.awaitOneSignalIdAvailable = undefined;
    user.isCreatingUser = false;
  }

  static createUserPropertiesModel(): OSModel<SupportedIdentity> {
    const properties = {
      language: Environment.getLanguage(),
      timezone_id: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    const propertiesOSModel = new OSModel<SupportedIdentity>(
      ModelName.Properties,
      properties,
    );

    OneSignal.coreDirector.add(
      ModelName.Properties,
      propertiesOSModel as OSModel<SupportedModel>,
      false,
    );

    return propertiesOSModel;
  }

  static async createUserOnServer(): Promise<UserData | undefined> {
    const user = User.createOrGetInstance();

    if (user.isCreatingUser) {
      return undefined;
    }

    user.isCreatingUser = true;

    try {
      const appId = await MainHelper.getAppId();
      const pushSubscription =
        await OneSignal.coreDirector.getPushSubscriptionModel();

      let subscriptionId;
      if (isCompleteSubscriptionObject(pushSubscription?.data)) {
        subscriptionId = pushSubscription?.data.id;
      }

      const userData = await UserDirector.getAllUserData();
      const response = await RequestService.createUser(
        { appId, subscriptionId },
        userData,
      );

      if (response.status >= 400) {
        Log.error('createUserOnServer: Failed to create user.');
        return undefined;
      }

      return response.result as UserData;
    } catch (e) {
      Log.error(e);
      return undefined;
    } finally {
      user.isCreatingUser = false;
    }
  }

  static async createAndHydrateUser(): Promise<UserData | undefined> {
    const userData = await UserDirector.createUserOnServer();
    if (userData) {
      OneSignal.coreDirector.hydrateUser(userData);
    }
    return userData;
  }

  static async getAllUserData(): Promise<UserData> {
    logMethodCall('LoginManager.getAllUserData');

    const identity = OneSignal.coreDirector.getIdentityModel();
    const properties = OneSignal.coreDirector.getPropertiesModel();
    const subscriptions: OSModel<SupportedSubscription>[] =
      await OneSignal.coreDirector.getAllSubscriptionsModels();

    const userData: Partial<UserData> = {};
    userData.identity = identity?.data;
    userData.properties = properties?.data;
    userData.subscriptions = subscriptions?.map(
      (subscription) => subscription.data,
    );

    return userData as UserData;
  }

  static async copyOneSignalIdPromiseFromIdentityModel() {
    const user = User.createOrGetInstance();
    // copy the onesignal id promise to the user
    const identity = OneSignal.coreDirector.getIdentityModel();
    user.awaitOneSignalIdAvailable = identity?.awaitOneSignalIdAvailable;

    user.awaitOneSignalIdAvailable?.then((onesignalId: string) => {
      user.hasOneSignalId = true;
      user.onesignalId = onesignalId;
    });
  }

  static async updateModelWithCurrentUserOneSignalId(
    model: OSModel<SupportedModel>,
  ): Promise<void> {
    const user = User.createOrGetInstance();
    // wait for the user's onesignal id to be loaded
    await user.awaitOneSignalIdAvailable;

    model.setOneSignalId(user.onesignalId);
  }
}
