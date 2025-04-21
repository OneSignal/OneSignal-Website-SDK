import {
  getResponseStatusType,
  ResponseStatusType,
} from 'src/shared/helpers/NetworkUtils';
import Log from 'src/shared/libraries/Log';
import { IdentityConstants, OPERATION_NAME } from '../constants';
import { type IdentityModelStore } from '../modelStores/IdentityModelStore';
import { type PropertiesModelStore } from '../modelStores/PropertiesModelStore';
import { ExecutionResponse } from '../operations/ExecutionResponse';
import { LoginUserFromSubscriptionOperation } from '../operations/LoginUserFromSubscriptionOperation';
import { Operation } from '../operations/Operation';
import { RefreshUserOperation } from '../operations/RefreshUserOperation';
import { RequestService } from '../requestService/RequestService';
import { ModelChangeTags } from '../types/models';
import { ExecutionResult, type IOperationExecutor } from '../types/operation';

// Implements logic similar to Android SDK's LoginUserFromSubscriptionOperationExecutor
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/user/internal/operations/impl/executors/LoginUserFromSubscriptionOperationExecutor.kt
export class LoginUserFromSubscriptionOperationExecutor
  implements IOperationExecutor
{
  constructor(
    private identityModelStore: IdentityModelStore,
    private propertiesModelStore: PropertiesModelStore,
  ) {}

  get operations(): string[] {
    return [OPERATION_NAME.LOGIN_USER_FROM_SUBSCRIPTION_USER];
  }

  async execute(operations: Operation[]): Promise<ExecutionResponse> {
    Log.debug(
      `LoginUserFromSubscriptionOperationExecutor(operation: ${operations})`,
    );

    if (operations.length > 1)
      throw new Error(
        `Only supports one operation! Attempted operations:\n${operations}`,
      );

    const startingOp = operations[0];
    if (startingOp instanceof LoginUserFromSubscriptionOperation)
      return this.loginUser(startingOp);

    throw new Error(`Unrecognized operation: ${startingOp}`);
  }

  private async loginUser(
    loginUserOp: LoginUserFromSubscriptionOperation,
  ): Promise<ExecutionResponse> {
    const response = await RequestService.getIdentityFromSubscription(
      { appId: loginUserOp.appId },
      loginUserOp.subscriptionId,
    );

    const { status, ok } = response;

    if (ok) {
      const identity = response.result.identity;

      const backendOneSignalId = identity[IdentityConstants.ONESIGNAL_ID];

      if (!backendOneSignalId) {
        Log.warn(
          `Subscription ${loginUserOp.subscriptionId} has no ${IdentityConstants.ONESIGNAL_ID}!`,
        );
        return new ExecutionResponse(ExecutionResult.FAIL_NORETRY);
      }

      const idTranslations: Record<string, string> = {};

      // Add the "local-to-backend" ID translation to the IdentifierTranslator for any operations that were
      // *not* executed but still reference the locally-generated IDs.
      // Update the current identity, property, and subscription models from a local ID to the backend ID
      idTranslations[loginUserOp.onesignalId] = backendOneSignalId;

      const identityModel = this.identityModelStore.model;
      const propertiesModel = this.propertiesModelStore.model;
      if (identityModel.onesignalId === loginUserOp.onesignalId) {
        identityModel.setProperty(
          IdentityConstants.ONESIGNAL_ID,
          backendOneSignalId,
          ModelChangeTags.HYDRATE,
        );
      }

      if (propertiesModel.onesignalId === loginUserOp.onesignalId) {
        propertiesModel.setProperty(
          'onesignalId',
          backendOneSignalId,
          ModelChangeTags.HYDRATE,
        );
      }

      return new ExecutionResponse(
        ExecutionResult.SUCCESS,
        undefined,
        [new RefreshUserOperation(loginUserOp.appId, backendOneSignalId)],
        idTranslations,
      );
    }

    const responseType = getResponseStatusType(status);
    switch (responseType) {
      case ResponseStatusType.RETRYABLE:
        return new ExecutionResponse(ExecutionResult.FAIL_RETRY);
      case ResponseStatusType.UNAUTHORIZED:
        return new ExecutionResponse(ExecutionResult.FAIL_UNAUTHORIZED);
      default:
        return new ExecutionResponse(ExecutionResult.FAIL_NORETRY);
    }
  }
}
