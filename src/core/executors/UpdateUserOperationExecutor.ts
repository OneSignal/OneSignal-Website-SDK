import {
  getResponseStatusType,
  ResponseStatusType,
} from 'src/shared/helpers/NetworkUtils';
import { PropertyOperationHelper } from 'src/shared/helpers/PropertyOperationHelper';
import Log from 'src/shared/libraries/Log';
import { OPERATION_NAME } from '../constants';
import {
  IPropertiesModelKeys,
  IPropertiesModelValues,
} from '../models/PropertiesModel';
import { type IdentityModelStore } from '../modelStores/IdentityModelStore';
import { PropertiesModelStore } from '../modelStores/PropertiesModelStore';
import { PropertiesDeltasObject } from '../objects/PropertiesDeltaObject';
import { PropertiesObject } from '../objects/PropertiesObject';
import { type NewRecordsState } from '../operationRepo/NewRecordsState';
import { DeleteTagOperation } from '../operations/DeleteTagOperation';
import { ExecutionResponse } from '../operations/ExecutionResponse';
import { Operation } from '../operations/Operation';
import { SetPropertyOperation } from '../operations/SetPropertyOperation';
import { SetTagOperation } from '../operations/SetTagOperation';
import { TrackSessionEndOperation } from '../operations/TrackSessionEndOperation';
import { TrackSessionStartOperation } from '../operations/TrackSessionStartOperation';
import AliasPair from '../requestService/AliasPair';
import { RequestService } from '../requestService/RequestService';
import { ModelChangeTags } from '../types/models';
import { ExecutionResult, IOperationExecutor } from '../types/operation';
import { type IRebuildUserService } from '../types/user';

// Implements logic similar to Android's SDK's UpdateUserOperationExecutor
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/user/internal/operations/impl/executors/UpdateUserOperationExecutor.kt
export class UpdateUserOperationExecutor implements IOperationExecutor {
  constructor(
    private _identityModelStore: IdentityModelStore,
    private _propertiesModelStore: PropertiesModelStore,
    private _buildUserService: IRebuildUserService,
    private _newRecordState: NewRecordsState,
  ) {}

  get operations(): string[] {
    return [
      OPERATION_NAME.SET_TAG,
      OPERATION_NAME.DELETE_TAG,
      OPERATION_NAME.SET_PROPERTY,
      OPERATION_NAME.TRACK_SESSION_START,
      OPERATION_NAME.TRACK_SESSION_END,
    ];
  }

  private processOperations(operations: Operation[]) {
    let appId: string | null = null;
    let onesignalId: string | null = null;
    let propertiesObject = new PropertiesObject();
    let deltasObject = new PropertiesDeltasObject();
    let refreshDeviceMetadata = false;

    for (const operation of operations) {
      if (
        operation instanceof SetTagOperation ||
        operation instanceof DeleteTagOperation ||
        operation instanceof SetPropertyOperation
      ) {
        if (!appId) {
          appId = operation.appId;
          onesignalId = operation.onesignalId;
        }
        propertiesObject =
          PropertyOperationHelper.createPropertiesFromOperation(
            operation,
            propertiesObject,
          );
      } else if (operation instanceof TrackSessionStartOperation) {
        if (!appId) {
          appId = operation.appId;
          onesignalId = operation.onesignalId;
        }
        const sessionCount = deltasObject.session_count
          ? deltasObject.session_count + 1
          : 1;
        deltasObject = new PropertiesDeltasObject(
          deltasObject.session_time,
          sessionCount,
        );
        refreshDeviceMetadata = true;
      } else if (operation instanceof TrackSessionEndOperation) {
        if (!appId) {
          appId = operation.appId;
          onesignalId = operation.onesignalId;
        }
        const sessionTime = deltasObject.session_time
          ? deltasObject.session_time + operation.sessionTime
          : operation.sessionTime;
        deltasObject = new PropertiesDeltasObject(
          sessionTime,
          deltasObject.session_count,
        );
      } else {
        throw new Error(`Unrecognized operation: ${operation}`);
      }
    }

    return {
      appId,
      onesignalId,
      propertiesObject,
      deltasObject,
      refreshDeviceMetadata,
    };
  }

  async execute(operations: Operation[]): Promise<ExecutionResponse> {
    Log.debug(`UpdateUserOperationExecutor(operation: ${operations})`);

    const {
      appId,
      onesignalId,
      propertiesObject,
      deltasObject,
      refreshDeviceMetadata,
    } = this.processOperations(operations);

    if (!appId || !onesignalId)
      return new ExecutionResponse(ExecutionResult.SUCCESS);

    const response = await RequestService.updateUser(
      { appId },
      new AliasPair(AliasPair.ONESIGNAL_ID, onesignalId),
      {
        properties: propertiesObject,
        refresh_device_metadata: refreshDeviceMetadata,
        deltas: deltasObject,
      },
    );

    const { ok, retryAfterSeconds, status } = response;

    if (ok) {
      if (this._identityModelStore.model.onesignalId === onesignalId) {
        for (const operation of operations) {
          const tags = { ...this._propertiesModelStore.model.tags };
          if (operation instanceof SetTagOperation) {
            tags[operation.key] = operation.value;
            this._propertiesModelStore.model.setProperty(
              'tags',
              tags,
              ModelChangeTags.HYDRATE,
            );
          } else if (operation instanceof DeleteTagOperation) {
            delete tags[operation.key];
            this._propertiesModelStore.model.setProperty(
              'tags',
              tags,
              ModelChangeTags.HYDRATE,
            );
          } else if (operation instanceof SetPropertyOperation) {
            this._propertiesModelStore.model.setProperty(
              operation.property as IPropertiesModelKeys,
              operation.value as IPropertiesModelValues,
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
          this._buildUserService.getRebuildOperationsIfCurrentUser(
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
