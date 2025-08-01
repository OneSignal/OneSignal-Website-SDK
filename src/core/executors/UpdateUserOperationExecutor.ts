import {
  getResponseStatusType,
  ResponseStatusType,
} from 'src/shared/helpers/NetworkUtils';
import { PropertyOperationHelper } from 'src/shared/helpers/PropertyOperationHelper';
import Log from 'src/shared/libraries/Log';
import { IdentityConstants, OPERATION_NAME } from '../constants';
import { type IPropertiesModelKeys } from '../models/PropertiesModel';
import { type IdentityModelStore } from '../modelStores/IdentityModelStore';
import { PropertiesModelStore } from '../modelStores/PropertiesModelStore';
import { PropertiesObject } from '../objects/PropertiesObject';
import { type NewRecordsState } from '../operationRepo/NewRecordsState';
import { ExecutionResponse } from '../operations/ExecutionResponse';
import { Operation } from '../operations/Operation';
import { SetPropertyOperation } from '../operations/SetPropertyOperation';
import { updateUserByAlias } from '../requestService';
import { ModelChangeTags } from '../types/models';
import { ExecutionResult, type IOperationExecutor } from '../types/operation';
import { type IRebuildUserService } from '../types/user';

// Implements logic similar to Android's SDK's UpdateUserOperationExecutor
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/user/internal/operations/impl/executors/UpdateUserOperationExecutor.kt
export class UpdateUserOperationExecutor implements IOperationExecutor {
  private _identityModelStore: IdentityModelStore;
  private _propertiesModelStore: PropertiesModelStore;
  private _buildUserService: IRebuildUserService;
  private _newRecordState: NewRecordsState;

  constructor(
    _identityModelStore: IdentityModelStore,
    _propertiesModelStore: PropertiesModelStore,
    _buildUserService: IRebuildUserService,
    _newRecordState: NewRecordsState,
  ) {
    this._identityModelStore = _identityModelStore;
    this._propertiesModelStore = _propertiesModelStore;
    this._buildUserService = _buildUserService;
    this._newRecordState = _newRecordState;
  }

  get operations(): string[] {
    return [OPERATION_NAME.SET_PROPERTY];
  }

  private processOperations(operations: Operation[]) {
    let appId: string | null = null;
    let onesignalId: string | null = null;
    let propertiesObject = new PropertiesObject();
    const refreshDeviceMetadata = false;

    for (const operation of operations) {
      if (operation instanceof SetPropertyOperation) {
        if (!appId) {
          appId = operation.appId;
          onesignalId = operation.onesignalId;
        }
        propertiesObject =
          PropertyOperationHelper.createPropertiesFromOperation(
            operation,
            propertiesObject,
          );
      } else {
        throw new Error(`Unrecognized operation: ${operation}`);
      }
    }

    return {
      appId,
      onesignalId,
      propertiesObject,
      refreshDeviceMetadata,
    };
  }

  async execute(operations: Operation[]): Promise<ExecutionResponse> {
    Log.debug(`UpdateUserOperationExecutor(operation: ${operations})`);

    const { appId, onesignalId, propertiesObject, refreshDeviceMetadata } =
      this.processOperations(operations);

    if (!appId || !onesignalId)
      return new ExecutionResponse(ExecutionResult.SUCCESS);

    const response = await updateUserByAlias(
      { appId },
      {
        label: IdentityConstants.ONESIGNAL_ID,
        id: onesignalId,
      },
      {
        properties: propertiesObject,
        refresh_device_metadata: refreshDeviceMetadata,
      },
    );

    const { ok, retryAfterSeconds, status } = response;

    const isTagProperty = (
      op: SetPropertyOperation,
    ): op is SetPropertyOperation<'tags'> => op.property === 'tags';

    if (ok) {
      if (this._identityModelStore.model.onesignalId === onesignalId) {
        for (const operation of operations) {
          if (operation instanceof SetPropertyOperation) {
            // removing empty string tags from operation.value to save space in IndexedDB and local memory.
            let value = operation.value;
            if (isTagProperty(operation)) {
              value = { ...operation.value };
              for (const key in value) if (value[key] === '') delete value[key];
            }

            this._propertiesModelStore.model.setProperty(
              operation.property as IPropertiesModelKeys,
              value,
              ModelChangeTags.HYDRATE,
            );
          }
        }
      }
      return new ExecutionResponse(ExecutionResult.SUCCESS);
    }

    const responseType = getResponseStatusType(status);
    switch (responseType) {
      case ResponseStatusType.RETRYABLE:
        return new ExecutionResponse(
          ExecutionResult.FAIL_RETRY,
          retryAfterSeconds,
        );

      case ResponseStatusType.UNAUTHORIZED:
        return new ExecutionResponse(
          ExecutionResult.FAIL_UNAUTHORIZED,
          retryAfterSeconds,
        );

      case ResponseStatusType.MISSING: {
        if (
          status === 404 &&
          this._newRecordState.isInMissingRetryWindow(onesignalId)
        ) {
          return new ExecutionResponse(
            ExecutionResult.FAIL_RETRY,
            retryAfterSeconds,
          );
        }
        const rebuildOps =
          await this._buildUserService.getRebuildOperationsIfCurrentUser(
            appId,
            onesignalId,
          );

        if (!rebuildOps)
          return new ExecutionResponse(ExecutionResult.FAIL_NORETRY);

        return new ExecutionResponse(
          ExecutionResult.FAIL_RETRY,
          retryAfterSeconds,
          rebuildOps,
        );
      }

      default:
        return new ExecutionResponse(ExecutionResult.FAIL_NORETRY);
    }
  }
}
