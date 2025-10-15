import {
  getDeviceModel,
  getDeviceOS,
  getSubscriptionType,
} from 'src/shared/environment/detect';
import {
  getResponseStatusType,
  ResponseStatusType,
} from 'src/shared/helpers/NetworkUtils';
import Log from 'src/shared/libraries/Log';
import { VERSION } from 'src/shared/utils/env';
import { OPERATION_NAME } from '../constants';
import { ExecutionResponse } from '../operations/ExecutionResponse';
import { Operation } from '../operations/Operation';
import { TrackCustomEventOperation } from '../operations/TrackCustomEventOperation';
import { sendCustomEvent } from '../requests/api';
import type { ICustomEventMetadata } from '../types/customEvents';
import { ExecutionResult, type IOperationExecutor } from '../types/operation';

// Implements logic similar to Android SDK's CustomEventOperationExecutor
// Reference: https://github.com/OneSignal/OneSignal-Android-SDK/blob/main/OneSignalSDK/onesignal/core/src/main/java/com/onesignal/user/internal/operations/impl/executors/CustomEventOperationExecutor.kt
export class CustomEventsOperationExecutor implements IOperationExecutor {
  get _operations(): string[] {
    return [OPERATION_NAME._CustomEvent];
  }

  private get _eventMetadata(): ICustomEventMetadata {
    return {
      sdk: VERSION,
      device_model: getDeviceModel(),
      device_os: getDeviceOS(),
      type: getSubscriptionType(),
    };
  }

  async _execute(operations: Operation[]): Promise<ExecutionResponse> {
    Log._debug(
      `CustomEventsOperationExecutor(operations: ${JSON.stringify(
        operations,
      )})`,
    );

    // TODO: each trackEvent is sent individually right now; may need to batch in the future
    const operation = operations[0];

    if (!(operation instanceof TrackCustomEventOperation)) {
      throw new Error(
        `Unrecognized operation! Expected TrackEventOperation, got: ${operation.constructor.name}`,
      );
    }

    const response = await sendCustomEvent(
      { appId: operation._appId },
      {
        name: operation.event.name,
        onesignal_id: operation._onesignalId,
        external_id: operation.externalId,
        timestamp: operation.timestamp,
        payload: {
          ...(operation.event.properties ?? {}),
          os_sdk: this._eventMetadata,
        },
      },
    );

    const { ok, status } = response;
    const responseType = getResponseStatusType(status);

    if (ok) return new ExecutionResponse(ExecutionResult.SUCCESS);

    switch (responseType) {
      case ResponseStatusType.RETRYABLE:
        return new ExecutionResponse(ExecutionResult.FAIL_RETRY);
      default:
        return new ExecutionResponse(ExecutionResult.FAIL_NORETRY);
    }
  }
}
