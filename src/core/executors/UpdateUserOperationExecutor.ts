import Log from 'src/shared/libraries/Log';
import { OPERATION_NAME } from '../constants';
import { type IdentityModelStore } from '../modelStores/IdentityModelStore';
import { type PropertiesModelStore } from '../modelStores/PropertiesModelStore';
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
import { IOperationExecutor } from '../types/operation';
import { IRebuildUserService } from '../types/user';

export class UpdateUserOperationExecutor implements IOperationExecutor {
  constructor(
    private _identityModelStore: IdentityModelStore,
    private _propertiesModelStore: PropertiesModelStore,
    private _buildUserService: IRebuildUserService,
    private _newRecordState: NewRecordsState,
    private _consistencyManager: IConsistencyManager,
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

  async execute(operations: Operation[]): Promise<ExecutionResponse> {
    Log.debug(`UpdateUserOperationExecutor(operation: ${operations})`);

    let appId: string;
    let onesignalId: string;
    let propertiesObject = new PropertiesObject();

    const deltasObject = new PropertiesDeltasObject();
    const refreshDeviceMetadata = false;

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
        //     if (appId === null) {
        //       appId = operation.appId;
        //       onesignalId = operation.onesignalId;
        //     }
        //     const sessionCount =
        //       deltasObject.sessionCount != null ? deltasObject.sessionCount + 1 : 1;
        //     deltasObject = new PropertiesDeltasObject(
        //       deltasObject.sessionTime,
        //       sessionCount,
        //       deltasObject.amountSpent,
        //       deltasObject.purchases,
        //     );
        //     refreshDeviceMetadata = true;
      } else if (operation instanceof TrackSessionEndOperation) {
        //     if (appId === null) {
        //       appId = operation.appId;
        //       onesignalId = operation.onesignalId;
        //     }
        //     const sessionTime =
        //       deltasObject.sessionTime != null
        //         ? deltasObject.sessionTime + operation.sessionTime
        //         : operation.sessionTime;
        //     deltasObject = new PropertiesDeltasObject(
        //       sessionTime,
        //       deltasObject.sessionCount,
        //       deltasObject.amountSpent,
        //       deltasObject.purchases,
        //     );
      } else if (operation instanceof TrackPurchaseOperation) {
        //     if (appId === null) {
        //       appId = operation.appId;
        //       onesignalId = operation.onesignalId;
        //     }
        //     const amountSpent =
        //       deltasObject.amountSpent != null
        //         ? deltasObject.amountSpent + operation.amountSpent
        //         : operation.amountSpent;
        //     const purchasesArray = deltasObject.purchases
        //       ? [...deltasObject.purchases]
        //       : [];
        //     for (const purchase of operation.purchases) {
        //       purchasesArray.push(
        //         new PurchaseObject(purchase.sku, purchase.iso, purchase.amount),
        //       );
        //     }
        //     deltasObject = new PropertiesDeltasObject(
        //       deltasObject.sessionTime,
        //       deltasObject.sessionCount,
        //       amountSpent,
        //       purchasesArray,
        //     );
      } else {
        throw new Error(`Unrecognized operation: ${operation}`);
      }
    }

    // if (appId && onesignalId) {
    //   try {
    //     const rywData = await this._userBackend.updateUser(
    //       appId,
    //       IdentityConstants.ONESIGNAL_ID,
    //       onesignalId,
    //       propertiesObject,
    //       refreshDeviceMetadata,
    //       deltasObject,
    //     );

    //     if (rywData != null) {
    //       this._consistencyManager.setRywData(
    //         onesignalId,
    //         IamFetchRywTokenKey.USER,
    //         rywData,
    //       );
    //     } else {
    //       this._consistencyManager.resolveConditionsWithID(
    //         IamFetchReadyCondition.ID,
    //       );
    //     }

    //     if (this._identityModelStore.model.onesignalId === onesignalId) {
    //       for (const operation of operations) {
    //         if (operation instanceof SetTagOperation) {
    //           this._propertiesModelStore.model.tags.setStringProperty(
    //             operation.key,
    //             operation.value,
    //             ModelChangeTags.HYDRATE,
    //           );
    //         } else if (operation instanceof DeleteTagOperation) {
    //           this._propertiesModelStore.model.tags.setOptStringProperty(
    //             operation.key,
    //             null,
    //             ModelChangeTags.HYDRATE,
    //           );
    //         } else if (operation instanceof SetPropertyOperation) {
    //           this._propertiesModelStore.model.setOptAnyProperty(
    //             operation.property,
    //             operation.value,
    //             ModelChangeTags.HYDRATE,
    //           );
    //         }
    //       }
    //     }
    //   } catch (ex) {
    //     if (!(ex instanceof BackendException)) throw ex;
    //     const responseType = NetworkUtils.getResponseStatusType(ex.statusCode);

    //     switch (responseType) {
    //       case NetworkUtils.ResponseStatusType.RETRYABLE:
    //         return new ExecutionResponse(
    //           ExecutionResult.FAIL_RETRY,
    //           undefined,
    //           ex.retryAfterSeconds,
    //         );
    //       case NetworkUtils.ResponseStatusType.UNAUTHORIZED:
    //         return new ExecutionResponse(
    //           ExecutionResult.FAIL_UNAUTHORIZED,
    //           undefined,
    //           ex.retryAfterSeconds,
    //         );
    //       case NetworkUtils.ResponseStatusType.MISSING:
    //         if (
    //           ex.statusCode === 404 &&
    //           this._newRecordState.isInMissingRetryWindow(onesignalId)
    //         ) {
    //           return new ExecutionResponse(
    //             ExecutionResult.FAIL_RETRY,
    //             undefined,
    //             ex.retryAfterSeconds,
    //           );
    //         }

    //         const rebuildOps =
    //           this._buildUserService.getRebuildOperationsIfCurrentUser(
    //             appId,
    //             onesignalId,
    //           );
    //         if (!rebuildOps) {
    //           return new ExecutionResponse(ExecutionResult.FAIL_NORETRY);
    //         }

    //         return new ExecutionResponse(
    //           ExecutionResult.FAIL_RETRY,
    //           rebuildOps,
    //           ex.retryAfterSeconds,
    //         );
    //       default:
    //         return new ExecutionResponse(ExecutionResult.FAIL_NORETRY);
    //     }
    //   }
    // }

    // return new ExecutionResponse(ExecutionResult.SUCCESS);
  }
}
