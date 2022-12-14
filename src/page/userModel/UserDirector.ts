import { OSModel } from "src/core/modelRepo/OSModel";
import { SupportedIdentity } from "src/core/models/IdentityModel";
import { ModelName, SupportedModel } from "src/core/models/SupportedModels";
import { isIdentityObject } from "src/core/utils/typePredicates";
import OneSignalError from "src/shared/errors/OneSignalError";
import Log from "src/shared/libraries/Log";
import { CoreModuleDirector } from "../../core/CoreModuleDirector";

export default class UserDirector {
  constructor(private coreDirector: CoreModuleDirector) {}

  async setupNewUser(isTempUser?: boolean): Promise<void> {
    const identityModel = await this.coreDirector.getIdentityModel();
    const userPropertiesModel = await this.coreDirector.getPropertiesModel();

    // if doesn't exist, create new user
    if (!identityModel) {
      await this._createAnonymousUser(isTempUser);
    }

    // initialize user properties
    if (!userPropertiesModel) {
      this._createUserProperties(isTempUser);
    }
  }

  private async _createAnonymousUser(isTempUser?: boolean): Promise<void> {
    let identityModel;

    if (isTempUser) {
      identityModel = {};
    } else {
      identityModel = await this.sendUserCreate();

      if (!isIdentityObject(identityModel)) {
        throw new OneSignalError("Invalid user create response");
      }
    }

    const identityOSModel = new OSModel<SupportedIdentity>(ModelName.Identity, identityModel);
    this.awaitOneSignalIdAvailable = this.identity.awaitOneSignalIdAvailable;

    /**
     * If we are not creating a local temp user, we should set the real id on the identity model
     * This will resolve the awaitOneSignalIdAvailable promises on user and models to indicate
     * that the user is now identified
     */
    if (!isTempUser) {
      // set the onesignal id on the OSModel class-level property
      this.identity.setOneSignalId(identityModel.onesignalId);
    }

    /**
     * Set the onesignal id on the OSModel `data` property
     * To keep the `OSModel` class model-agnostic, we do not want to add any Identity Model-specific code in the
     * `setOneSignalId` function. Therefore, we must manually set the onesignal id on the `data` property as well
     */
    // TO DO: cover with unit test
    this.identity.data.onesignalId = identityModel.onesignalId;

    OneSignal.coreDirector.add(ModelName.Identity, this.identity as OSModel<SupportedModel>, false).catch(e => {
      Log.error(e);
    });
  }
}