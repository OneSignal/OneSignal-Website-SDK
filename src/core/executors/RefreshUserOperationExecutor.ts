import { getPushId } from 'src/shared/database/subscription';
import {
  getResponseStatusType,
  ResponseStatusType,
} from 'src/shared/helpers/NetworkUtils';
import SubscriptionHelper from 'src/shared/helpers/SubscriptionHelper';
import Log from 'src/shared/libraries/Log';
import { NotificationType } from 'src/shared/subscriptions/constants';
import { IdentityConstants, OPERATION_NAME } from '../constants';
import { IdentityModel } from '../models/IdentityModel';
import {
  type IPropertiesModelKeys,
  PropertiesModel,
} from '../models/PropertiesModel';
import { SubscriptionModel } from '../models/SubscriptionModel';
import { type IdentityModelStore } from '../modelStores/IdentityModelStore';
import { type PropertiesModelStore } from '../modelStores/PropertiesModelStore';
import { type SubscriptionModelStore } from '../modelStores/SubscriptionModelStore';
import { type NewRecordsState } from '../operationRepo/NewRecordsState';
import { ExecutionResponse } from '../operations/ExecutionResponse';
import { Operation } from '../operations/Operation';
import { RefreshUserOperation } from '../operations/RefreshUserOperation';
import { getUserByAlias } from '../requests/api';
import { ModelChangeTags } from '../types/models';
import { ExecutionResult, type IOperationExecutor } from '../types/operation';
import { type IRebuildUserService } from '../types/user';

// Implements logic similar to Android SDK's RefreshUserOperationExecutor
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/5.1.31/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/user/internal/operations/impl/executors/RefreshUserOperationExecutor.kt
export class RefreshUserOperationExecutor implements IOperationExecutor {
  private _identityModelStore: IdentityModelStore;
  private _propertiesModelStore: PropertiesModelStore;
  private _subscriptionsModelStore: SubscriptionModelStore;
  private _buildUserService: IRebuildUserService;
  private _newRecordState: NewRecordsState;

  constructor(
    _identityModelStore: IdentityModelStore,
    _propertiesModelStore: PropertiesModelStore,
    _subscriptionsModelStore: SubscriptionModelStore,
    _buildUserService: IRebuildUserService,
    _newRecordState: NewRecordsState,
  ) {
    this._identityModelStore = _identityModelStore;
    this._propertiesModelStore = _propertiesModelStore;
    this._subscriptionsModelStore = _subscriptionsModelStore;
    this._buildUserService = _buildUserService;
    this._newRecordState = _newRecordState;
  }

  get operations(): string[] {
    return [OPERATION_NAME.REFRESH_USER];
  }

  async execute(operations: Operation[]): Promise<ExecutionResponse> {
    Log.debug(
      `RefreshUserOperationExecutor(operation: ${JSON.stringify(operations)})`,
    );

    if (operations.some((op) => !(op instanceof RefreshUserOperation)))
      throw new Error(
        `Unrecognized operation(s)! Attempted operations:\n${JSON.stringify(
          operations,
        )}`,
      );

    const startingOp = operations[0];
    return this.getUser(startingOp);
  }

  private async getUser(op: RefreshUserOperation): Promise<ExecutionResponse> {
    const response = await getUserByAlias(
      { appId: op.appId },
      {
        label: IdentityConstants.ONESIGNAL_ID,
        id: op.onesignalId,
      },
    );

    const { ok, result, retryAfterSeconds, status } = response;
    if (ok) {
      if (op.onesignalId !== this._identityModelStore.model.onesignalId) {
        return new ExecutionResponse(ExecutionResult.SUCCESS);
      }

      const identityModel = new IdentityModel();
      for (const [key, value] of Object.entries(result.identity)) {
        identityModel.setProperty(key, value);
      }

      const propertiesModel = new PropertiesModel();
      propertiesModel.onesignalId = op.onesignalId;

      const { properties = {}, subscriptions = [] } = result;

      Object.entries(properties).forEach(([key, value]) => {
        propertiesModel.setProperty(key as IPropertiesModelKeys, value);
      });

      const subscriptionModels: SubscriptionModel[] = [];
      for (const sub of subscriptions) {
        const model = new SubscriptionModel();
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        model.id = sub.id!;
        model.token = sub.token ?? '';
        model.notification_types =
          sub.notification_types ?? NotificationType.Subscribed;
        model.type = sub.type;
        model.enabled =
          model.notification_types !== NotificationType.UserOptedOut;
        model.sdk = sub.sdk;
        model.device_os = sub.device_os;
        model.device_model = sub.device_model;
        model.onesignalId = op.onesignalId;

        // We only add a non-push subscriptions. For push, the device is the source of truth
        // so we don't want to cache these subscriptions from the backend.
        if (!SubscriptionHelper.isPushSubscriptionType(model.type)) {
          subscriptionModels.push(model);
        }
      }

      const pushSubscriptionId = await getPushId();

      if (pushSubscriptionId) {
        const cachedPushModel =
          this._subscriptionsModelStore.getBySubscriptionId(pushSubscriptionId);
        if (cachedPushModel) {
          cachedPushModel.onesignalId = op.onesignalId;
          subscriptionModels.push(cachedPushModel);
        }
      }

      this._identityModelStore.replace(identityModel, ModelChangeTags.HYDRATE);
      this._propertiesModelStore.replace(
        propertiesModel,
        ModelChangeTags.HYDRATE,
      );
      this._subscriptionsModelStore.replaceAll(
        subscriptionModels,
        ModelChangeTags.HYDRATE,
      );

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
          this._newRecordState.isInMissingRetryWindow(op.onesignalId)
        )
          return new ExecutionResponse(
            ExecutionResult.FAIL_RETRY,
            retryAfterSeconds,
          );

        const rebuildOps =
          await this._buildUserService.getRebuildOperationsIfCurrentUser(
            op.appId,
            op.onesignalId,
          );
        return rebuildOps
          ? new ExecutionResponse(
              ExecutionResult.FAIL_RETRY,
              retryAfterSeconds,
              rebuildOps,
            )
          : new ExecutionResponse(ExecutionResult.FAIL_NORETRY);
      }
      default:
        return new ExecutionResponse(ExecutionResult.FAIL_NORETRY);
    }
  }
}
