import { IdentityModel } from 'src/core/models/IdentityModel';
import { PropertiesModel } from 'src/core/models/PropertiesModel';
import { CreateSubscriptionOperation } from 'src/core/operations/CreateSubscriptionOperation';
import { LoginUserOperation } from 'src/core/operations/LoginUserOperation';
import { error } from 'src/shared/libraries/log';
import { IDManager } from 'src/shared/managers/IDManager';
import { getAppId } from '../shared/helpers/main';

export async function createUserOnServer(): Promise<void> {
  const identityModel = OneSignal._coreDirector._getIdentityModel();
  const appId = getAppId();

  const hasAnySubscription =
    OneSignal._coreDirector._subscriptionModelStore._list().length > 0;

  const hasExternalId = !!identityModel._externalId;

  if (!hasAnySubscription && !hasExternalId) {
    error('No subscriptions or external ID found, skipping user creation');
    return;
  }

  const pushOp = await OneSignal._coreDirector._getPushSubscriptionModel();
  if (pushOp) {
    const subData = pushOp.toJSON();

    OneSignal._coreDirector._operationRepo._enqueue(
      new LoginUserOperation(
        appId,
        identityModel._onesignalId,
        identityModel._externalId,
      ),
    );
    await OneSignal._coreDirector._operationRepo._enqueueAndWait(
      new CreateSubscriptionOperation({
        ...subData,
        appId,
        onesignalId: identityModel._onesignalId,
        subscriptionId: pushOp.id!,
      }),
    );
  } else {
    OneSignal._coreDirector._operationRepo._enqueue(
      new LoginUserOperation(
        appId,
        identityModel._onesignalId,
        identityModel._externalId,
      ),
    );
  }
}

// Resets models similar to Android SDK
// https://github.com/OneSignal/OneSignal-Android-SDK/blob/ed2e87618ea3af81b75f97b0a4cbb8f658c7fc80/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/internal/OneSignalImp.kt#L448
export function resetUserModels() {
  // replace models
  const newIdentityModel = new IdentityModel();
  const newPropertiesModel = new PropertiesModel();

  const sdkId = IDManager._createLocalId();
  newIdentityModel._onesignalId = sdkId;
  newPropertiesModel._onesignalId = sdkId;

  OneSignal._coreDirector._identityModelStore._replace(newIdentityModel);
  OneSignal._coreDirector._propertiesModelStore._replace(newPropertiesModel);
}
