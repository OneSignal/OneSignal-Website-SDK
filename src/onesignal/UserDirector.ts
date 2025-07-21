import { IdentityModel } from 'src/core/models/IdentityModel';
import { PropertiesModel } from 'src/core/models/PropertiesModel';
import { SubscriptionModel } from 'src/core/models/SubscriptionModel';
import { TransferSubscriptionOperation } from 'src/core/operations/TransferSubscriptionOperation';
import { ModelChangeTags, ModelChangeTagValue } from 'src/core/types/models';
import { NotificationType } from 'src/core/types/subscription';
import FuturePushSubscriptionRecord from 'src/page/userModel/FuturePushSubscriptionRecord';
import { IDManager } from 'src/shared/managers/IDManager';
import Database from 'src/shared/services/Database';
import MainHelper from '../shared/helpers/MainHelper';

export default class UserDirector {
  static createAndSwitchToNewUser(
    modifiyModels?: (
      identityModel: IdentityModel,
      propertiesModel: PropertiesModel,
    ) => void,
  ): void {
    console.log('createAndSwitchToNewUser');
    const appId = MainHelper.getAppId();

    // replace models
    const newIdentityModel = new IdentityModel();
    const newPropertiesModel = new PropertiesModel();

    const sdkId = IDManager.createLocalId();
    newIdentityModel.onesignalId = sdkId;
    newPropertiesModel.onesignalId = sdkId;

    if (modifiyModels) {
      modifiyModels(newIdentityModel, newPropertiesModel);
    }

    // Create the push subscription for this device under the new user, copying the current
    // user's push subscription if one exists.  We also copy the ID. If the ID is local there
    // will already be a CreateSubscriptionOperation on the queue.  If the ID is remote the subscription
    // will be automatically transferred over to this new user being created.  If there is no
    // current push subscription we do a "normal" replace which will drive adding a CreateSubscriptionOperation
    // to the queue.
    const pushOp = OneSignal.coreDirector.getPushSubscriptionModel();
    const newPushOp = new SubscriptionModel();

    newPushOp.id = pushOp?.id ?? IDManager.createLocalId();
    newPushOp.type =
      pushOp?.type ?? FuturePushSubscriptionRecord.getSubscriptionType();
    newPushOp.enabled = pushOp?.enabled ?? true;
    newPushOp.token = pushOp?.token ?? '';
    newPushOp.notification_types =
      pushOp?.notification_types ?? NotificationType.NoNativePermission;

    OneSignal.coreDirector.subscriptionModelStore.clear(
      ModelChangeTags.NO_PROPOGATE,
    );
    OneSignal.coreDirector.identityModelStore.replace(newIdentityModel);
    OneSignal.coreDirector.propertiesModelStore.replace(newPropertiesModel);

    let changeTag: ModelChangeTagValue = ModelChangeTags.NO_PROPOGATE;
    if (pushOp?.id && newIdentityModel.externalId) {
      // add a transfer-subscription operation when switching user
      OneSignal.coreDirector.operationRepo.enqueue(
        new TransferSubscriptionOperation(
          appId,
          newIdentityModel.onesignalId,
          pushOp.id,
        ),
      );
    } else {
      changeTag = ModelChangeTags.NORMAL;
    }

    OneSignal.coreDirector.subscriptionModelStore.add(newPushOp, changeTag);
    Database.setTokenAndId({
      id: newPushOp.id,
      token: newPushOp.token,
    });
  }
}
