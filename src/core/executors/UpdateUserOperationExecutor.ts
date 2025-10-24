import {
  getResponseStatusType,
  ResponseStatusType,
} from 'src/shared/helpers/network';
import Log from 'src/shared/libraries/Log';
import { IdentityConstants, OPERATION_NAME } from '../constants';
import { type IPropertiesModelKeys } from '../models/PropertiesModel';
import { type IdentityModelStore } from '../modelStores/IdentityModelStore';
import { PropertiesModelStore } from '../modelStores/PropertiesModelStore';
import { type NewRecordsState } from '../operationRepo/NewRecordsState';
import { Operation } from '../operations/Operation';
import { SetPropertyOperation } from '../operations/SetPropertyOperation';
import { updateUserByAlias } from '../requests/api';
import { ModelChangeTags } from '../types/models';
import type { ExecutionResponse } from '../types/operation';
import { ExecutionResult, type IOperationExecutor } from '../types/operation';
import { type IRebuildUserService } from '../types/user';

type PropertiesObject = {
  ip?: string;
  tags?: Record<string, string>;
  language?: string;
  timezone_id?: string;
  country?: string;
};

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

  get _operations(): string[] {
    return [OPERATION_NAME._SetProperty];
  }

  private _processOperations(operations: Operation[]) {
    let appId: string | null = null;
    let onesignalId: string | null = null;
    let propertiesObject: PropertiesObject = {};
    const refreshDeviceMetadata = false;

    for (const operation of operations) {
      if (operation instanceof SetPropertyOperation) {
        if (!appId) {
          appId = operation._appId;
          onesignalId = operation._onesignalId;
        }
        propertiesObject = createPropertiesFromOperation(
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

  async _execute(operations: Operation[]): Promise<ExecutionResponse> {
    Log._debug(`UpdateUserOperationExecutor(operation: ${operations})`);

    const { appId, onesignalId, propertiesObject, refreshDeviceMetadata } =
      this._processOperations(operations);

    if (!appId || !onesignalId) return { _result: ExecutionResult._Success };

    const response = await updateUserByAlias(
      { appId },
      {
        label: IdentityConstants._OneSignalID,
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
    ): op is SetPropertyOperation<'tags'> => op._property === 'tags';

    if (ok) {
      if (this._identityModelStore._model._onesignalId === onesignalId) {
        for (const operation of operations) {
          if (operation instanceof SetPropertyOperation) {
            // removing empty string tags from operation.value to save space in IndexedDB and local memory.
            let value = operation.value;
            if (isTagProperty(operation)) {
              value = { ...operation.value };
              for (const key in value) if (value[key] === '') delete value[key];
            }

            this._propertiesModelStore._model._setProperty(
              operation._property as IPropertiesModelKeys,
              value,
              ModelChangeTags._Hydrate,
            );
          }
        }
      }
      return { _result: ExecutionResult._Success };
    }

    const responseType = getResponseStatusType(status);
    switch (responseType) {
      case ResponseStatusType._Retryable:
        return {
          _result: ExecutionResult._FailRetry,
          _retryAfterSeconds: retryAfterSeconds,
        };

      case ResponseStatusType._Unauthorized:
        return {
          _result: ExecutionResult._FailUnauthorized,
          _retryAfterSeconds: retryAfterSeconds,
        };

      case ResponseStatusType._Missing: {
        if (
          status === 404 &&
          this._newRecordState._isInMissingRetryWindow(onesignalId)
        ) {
          return {
            _result: ExecutionResult._FailRetry,
            _retryAfterSeconds: retryAfterSeconds,
          };
        }
        const rebuildOps =
          await this._buildUserService._getRebuildOperationsIfCurrentUser(
            appId,
            onesignalId,
          );

        if (!rebuildOps) return { _result: ExecutionResult._FailNoretry };

        return {
          _result: ExecutionResult._FailRetry,
          _retryAfterSeconds: retryAfterSeconds,
          _operations: rebuildOps,
        };
      }

      default:
        return { _result: ExecutionResult._FailNoretry };
    }
  }
}

function createPropertiesFromOperation(
  operation: Operation,
  properties: PropertiesObject,
): PropertiesObject {
  if (operation instanceof SetPropertyOperation) {
    const propertyKey = operation._property;
    const allowedKeys: IPropertiesModelKeys[] = [
      'ip',
      'tags',
      'language',
      'timezone_id',
      'country',
    ];
    if (allowedKeys.includes(propertyKey as IPropertiesModelKeys)) {
      return {
        ...properties,
        [propertyKey]: operation.value,
      };
    }
    return { ...properties };
  }

  throw new Error(`Unsupported operation type: ${operation._name}`);
}
